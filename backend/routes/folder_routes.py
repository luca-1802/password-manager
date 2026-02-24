import logging
from filelock import FileLock
from flask import Blueprint, request, jsonify
from backend.routes.vault_routes import (
    require_auth, get_session_material, save_vault,
    validate_folder, count_existing_folders, MAX_FOLDERS,
)
from backend.vault import load_passwords_with_key, normalize_entries

logger = logging.getLogger(__name__)

folder_bp = Blueprint("folders", __name__)

MAX_FOLDER_NAME_LENGTH = 50

@folder_bp.route("/", methods=["GET"])
@require_auth
def list_folders():
    try:
        key_raw, _, vault_path = get_session_material()
        passwords = load_passwords_with_key(key_raw, vault_path)
    except Exception as e:
        logger.error("Failed to load vault data: %s", e)
        return jsonify({"error": "Failed to decrypt vault. Please log in again."}), 500

    folders = sorted(count_existing_folders(passwords))
    return jsonify({"folders": folders})

@folder_bp.route("/", methods=["POST"])
@require_auth
def create_folder():
    data = request.get_json()
    if not data or not data.get("name"):
        return jsonify({"error": "Folder name is required"}), 400

    name = data["name"]
    if not isinstance(name, str):
        return jsonify({"error": "Folder name must be a string"}), 400
    name = name.strip()

    folder_err = validate_folder(name)
    if folder_err:
        return jsonify({"error": folder_err}), 400
    if not name:
        return jsonify({"error": "Folder name cannot be empty"}), 400

    try:
        key_raw, salt, vault_path = get_session_material()
    except Exception as e:
        logger.error("Failed to load vault session data: %s", e)
        return jsonify({"error": "Failed to decrypt vault. Please log in again."}), 500

    try:
        with FileLock(vault_path + ".lock"):
            passwords = load_passwords_with_key(key_raw, vault_path)
            existing_folders = count_existing_folders(passwords)

            if name in existing_folders:
                return jsonify({"error": "Folder already exists"}), 409

            if len(existing_folders) >= MAX_FOLDERS:
                return jsonify({"error": f"Maximum of {MAX_FOLDERS} folders reached"}), 400

            meta = passwords.get("_folders_meta", [])
            if not isinstance(meta, list):
                meta = []
            if name not in meta:
                meta.append(name)
            passwords["_folders_meta"] = meta
            save_vault(key_raw, salt, vault_path, passwords)
    except Exception as e:
        logger.error("Failed to update vault data: %s", e)
        return jsonify({"error": "Failed to decrypt vault. Please log in again."}), 500

    return jsonify({"success": True}), 201

@folder_bp.route("/<name>", methods=["PUT"])
@require_auth
def rename_folder(name):
    folder_err = validate_folder(name)
    if folder_err:
        return jsonify({"error": folder_err}), 400

    data = request.get_json()
    if not data or not data.get("new_name"):
        return jsonify({"error": "New folder name is required"}), 400

    new_name = data["new_name"]
    if not isinstance(new_name, str):
        return jsonify({"error": "New folder name must be a string"}), 400
    new_name = new_name.strip()

    folder_err = validate_folder(new_name)
    if folder_err:
        return jsonify({"error": folder_err}), 400
    if not new_name:
        return jsonify({"error": "New folder name cannot be empty"}), 400

    try:
        key_raw, salt, vault_path = get_session_material()
    except Exception as e:
        logger.error("Failed to load vault session data: %s", e)
        return jsonify({"error": "Failed to decrypt vault. Please log in again."}), 500

    try:
        with FileLock(vault_path + ".lock"):
            passwords = load_passwords_with_key(key_raw, vault_path)
            changed = False
            for website in list(passwords.keys()):
                if website in ("_folders_meta", "_notes"):
                    continue
                entries = normalize_entries(passwords[website])
                for entry in entries:
                    if entry.get("folder") == name:
                        entry["folder"] = new_name
                        changed = True
                passwords[website] = entries

            notes_data = passwords.get("_notes", {})
            if isinstance(notes_data, dict):
                for title in list(notes_data.keys()):
                    note_entries = normalize_entries(notes_data[title])
                    for entry in note_entries:
                        if entry.get("folder") == name:
                            entry["folder"] = new_name
                            changed = True
                    notes_data[title] = note_entries
                if notes_data:
                    passwords["_notes"] = notes_data

            meta = passwords.get("_folders_meta", [])
            if isinstance(meta, list) and name in meta:
                meta = [new_name if f == name else f for f in meta]
                passwords["_folders_meta"] = meta
                changed = True

            if not changed:
                return jsonify({"error": "Folder not found"}), 404

            save_vault(key_raw, salt, vault_path, passwords)
    except Exception as e:
        logger.error("Failed to update vault data: %s", e)
        return jsonify({"error": "Failed to decrypt vault. Please log in again."}), 500

    return jsonify({"success": True})

@folder_bp.route("/<name>", methods=["DELETE"])
@require_auth
def delete_folder(name):
    folder_err = validate_folder(name)
    if folder_err:
        return jsonify({"error": folder_err}), 400

    try:
        key_raw, salt, vault_path = get_session_material()
    except Exception as e:
        logger.error("Failed to load vault session data: %s", e)
        return jsonify({"error": "Failed to decrypt vault. Please log in again."}), 500

    try:
        with FileLock(vault_path + ".lock"):
            passwords = load_passwords_with_key(key_raw, vault_path)
            changed = False
            for website in list(passwords.keys()):
                if website in ("_folders_meta", "_notes"):
                    continue
                entries = normalize_entries(passwords[website])
                for entry in entries:
                    if entry.get("folder") == name:
                        del entry["folder"]
                        changed = True
                passwords[website] = entries

            notes_data = passwords.get("_notes", {})
            if isinstance(notes_data, dict):
                for title in list(notes_data.keys()):
                    note_entries = normalize_entries(notes_data[title])
                    for entry in note_entries:
                        if entry.get("folder") == name:
                            del entry["folder"]
                            changed = True
                    notes_data[title] = note_entries
                if notes_data:
                    passwords["_notes"] = notes_data

            meta = passwords.get("_folders_meta", [])
            if isinstance(meta, list) and name in meta:
                meta = [f for f in meta if f != name]
                if meta:
                    passwords["_folders_meta"] = meta
                else:
                    passwords.pop("_folders_meta", None)
                changed = True

            if not changed:
                return jsonify({"error": "Folder not found"}), 404

            save_vault(key_raw, salt, vault_path, passwords)
    except Exception as e:
        logger.error("Failed to update vault data: %s", e)
        return jsonify({"error": "Failed to decrypt vault. Please log in again."}), 500

    return jsonify({"success": True})