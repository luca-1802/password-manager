import logging
from filelock import FileLock
from flask import Blueprint, request, jsonify
from backend.routes.vault_routes import (
    require_auth, get_session_material, save_vault,
    validate_website, validate_folder,
    validate_recovery_questions, count_existing_folders,
    RESERVED_KEYS, MAX_TOTAL_ENTRIES, MAX_NOTES_PER_TITLE,
    MAX_NOTE_CONTENT_LENGTH, MAX_FOLDERS,
)
from backend.vault import load_passwords_with_key

logger = logging.getLogger(__name__)

note_bp = Blueprint("notes", __name__)


def _count_total_entries(passwords):
    total = 0
    for key, value in passwords.items():
        if key == "_folders_meta":
            continue
        if key == "_notes":
            if isinstance(value, dict):
                for title, note_entries in value.items():
                    if isinstance(note_entries, list):
                        total += len(note_entries)
                    else:
                        total += 1
            continue
        if key == "_files":
            if isinstance(value, dict):
                for label, file_entries in value.items():
                    if isinstance(file_entries, list):
                        total += len(file_entries)
                    else:
                        total += 1
            continue
        if isinstance(value, list):
            total += len(value)
        else:
            total += 1
    return total


@note_bp.route("/", methods=["POST"])
@require_auth
def create_note():
    data = request.get_json()
    if not data or not data.get("title") or not data.get("content"):
        return jsonify({"error": "Title and content are required"}), 400

    if not isinstance(data.get("title"), str) or not isinstance(data.get("content"), str):
        return jsonify({"error": "Title and content must be strings"}), 400

    title = data["title"].strip().lower()
    content = data["content"]

    if not validate_website(title):
        return jsonify({"error": "Invalid note title"}), 400

    if len(content) > MAX_NOTE_CONTENT_LENGTH:
        return jsonify({"error": f"Content must be at most {MAX_NOTE_CONTENT_LENGTH} characters"}), 400

    folder = data.get("folder")
    if folder is not None:
        if not isinstance(folder, str):
            return jsonify({"error": "Folder must be a string"}), 400
        folder = folder.strip() or None

    folder_err = validate_folder(folder)
    if folder_err:
        return jsonify({"error": folder_err}), 400

    recovery_questions = data.get("recovery_questions")
    rq_err = validate_recovery_questions(recovery_questions)
    if rq_err:
        return jsonify({"error": rq_err}), 400

    try:
        key_raw, salt, vault_path = get_session_material()
    except Exception as e:
        logger.error("Failed to load vault session data: %s", e)
        return jsonify({"error": "Failed to decrypt vault. Please log in again."}), 500

    try:
        with FileLock(vault_path + ".lock"):
            passwords = load_passwords_with_key(key_raw, vault_path)

            total_entries = _count_total_entries(passwords)
            if total_entries >= MAX_TOTAL_ENTRIES:
                return jsonify({"error": "Vault entry limit reached"}), 400

            if folder:
                existing_folders = count_existing_folders(passwords)
                if folder not in existing_folders and len(existing_folders) >= MAX_FOLDERS:
                    return jsonify({"error": f"Maximum of {MAX_FOLDERS} folders reached"}), 400

            notes_data = passwords.get("_notes", {})
            if not isinstance(notes_data, dict):
                notes_data = {}

            if title not in notes_data:
                notes_data[title] = []

            if not isinstance(notes_data[title], list):
                notes_data[title] = [notes_data[title]]

            if len(notes_data[title]) >= MAX_NOTES_PER_TITLE:
                return jsonify({"error": "Too many notes for this title"}), 400

            entry = {"type": "note", "content": content}
            if folder:
                entry["folder"] = folder
            if recovery_questions:
                entry["recovery_questions"] = recovery_questions

            notes_data[title].append(entry)
            passwords["_notes"] = notes_data
            save_vault(key_raw, salt, vault_path, passwords)
    except Exception as e:
        logger.error("Failed to update vault data: %s", e)
        return jsonify({"error": "Failed to decrypt vault. Please log in again."}), 500

    return jsonify({"success": True}), 201


@note_bp.route("/<int:index>/<path:title>", methods=["PUT"])
@require_auth
def edit_note(index, title):
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    title = title.lower()
    if not validate_website(title):
        return jsonify({"error": "Invalid note title"}), 400

    try:
        key_raw, salt, vault_path = get_session_material()
    except Exception as e:
        logger.error("Failed to load vault session data: %s", e)
        return jsonify({"error": "Failed to decrypt vault. Please log in again."}), 500

    try:
        with FileLock(vault_path + ".lock"):
            passwords = load_passwords_with_key(key_raw, vault_path)

            notes_data = passwords.get("_notes", {})
            if not isinstance(notes_data, dict) or title not in notes_data:
                return jsonify({"error": "Note not found"}), 404

            entries = notes_data[title]
            if not isinstance(entries, list):
                entries = [entries]

            if index < 0 or index >= len(entries):
                return jsonify({"error": "Invalid index"}), 400

            if "content" in data:
                if not isinstance(data["content"], str):
                    return jsonify({"error": "Content must be a string"}), 400
                content = data["content"]
                if not content:
                    return jsonify({"error": "Content cannot be empty"}), 400
                if len(content) > MAX_NOTE_CONTENT_LENGTH:
                    return jsonify({"error": f"Content must be at most {MAX_NOTE_CONTENT_LENGTH} characters"}), 400
                entries[index]["content"] = content

            if "folder" in data:
                folder = data["folder"]
                if folder is not None:
                    if not isinstance(folder, str):
                        return jsonify({"error": "Folder must be a string"}), 400
                    folder = folder.strip() or None
                folder_err = validate_folder(folder)
                if folder_err:
                    return jsonify({"error": folder_err}), 400
                if folder:
                    existing_folders = count_existing_folders(passwords)
                    if folder not in existing_folders and len(existing_folders) >= MAX_FOLDERS:
                        return jsonify({"error": f"Maximum of {MAX_FOLDERS} folders reached"}), 400
                    entries[index]["folder"] = folder
                else:
                    entries[index].pop("folder", None)

            if "recovery_questions" in data:
                rq = data["recovery_questions"]
                rq_err = validate_recovery_questions(rq)
                if rq_err:
                    return jsonify({"error": rq_err}), 400
                if rq:
                    entries[index]["recovery_questions"] = rq
                else:
                    entries[index].pop("recovery_questions", None)

            notes_data[title] = entries
            passwords["_notes"] = notes_data
            save_vault(key_raw, salt, vault_path, passwords)
    except Exception as e:
        logger.error("Failed to update vault data: %s", e)
        return jsonify({"error": "Failed to decrypt vault. Please log in again."}), 500

    return jsonify({"success": True})


@note_bp.route("/<int:index>/<path:title>", methods=["DELETE"])
@require_auth
def delete_note(index, title):
    title = title.lower()
    if not validate_website(title):
        return jsonify({"error": "Invalid note title"}), 400

    try:
        key_raw, salt, vault_path = get_session_material()
    except Exception as e:
        logger.error("Failed to load vault session data: %s", e)
        return jsonify({"error": "Failed to decrypt vault. Please log in again."}), 500

    try:
        with FileLock(vault_path + ".lock"):
            passwords = load_passwords_with_key(key_raw, vault_path)

            notes_data = passwords.get("_notes", {})
            if not isinstance(notes_data, dict) or title not in notes_data:
                return jsonify({"error": "Note not found"}), 404

            entries = notes_data[title]
            if not isinstance(entries, list):
                entries = [entries]

            if index < 0 or index >= len(entries):
                return jsonify({"error": "Invalid index"}), 400

            entries.pop(index)
            if not entries:
                del notes_data[title]
            else:
                notes_data[title] = entries

            if notes_data:
                passwords["_notes"] = notes_data
            else:
                passwords.pop("_notes", None)

            save_vault(key_raw, salt, vault_path, passwords)
    except Exception as e:
        logger.error("Failed to update vault data: %s", e)
        return jsonify({"error": "Failed to decrypt vault. Please log in again."}), 500

    return jsonify({"success": True})
