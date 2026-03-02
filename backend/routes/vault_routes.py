import re
import logging
from functools import wraps
from filelock import FileLock
from flask import Blueprint, request, jsonify, session, current_app
from backend.vault import load_passwords_with_key, save_passwords_with_key, generate_password, normalize_entries
from datetime import datetime, timezone
from backend.routes.auth_routes import _decrypt_session_value

logger = logging.getLogger(__name__)

vault_bp = Blueprint("vault", __name__)

MAX_WEBSITE_LENGTH = 253
MAX_USERNAME_LENGTH = 256
MAX_PASSWORD_LENGTH = 1024
MAX_FOLDER_NAME_LENGTH = 50
MAX_FOLDERS = 50
MAX_TOTAL_ENTRIES = 10000
MAX_ENTRIES_PER_SITE = 100
MAX_NOTES_FIELD_LENGTH = 10000
MAX_NOTE_CONTENT_LENGTH = 50000
MAX_RECOVERY_QUESTIONS = 10
MAX_RECOVERY_Q_LENGTH = 500
MAX_NOTES_PER_TITLE = 100
MAX_FILE_SIZE = 5 * 1024 * 1024
MAX_FILES = 100
MAX_FILES_PER_LABEL = 100
MAX_FILE_DESCRIPTION_LENGTH = 1000
MAX_PASSWORD_HISTORY = 20

def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        from flask import g
        if getattr(g, 'is_token_auth', False):
            return f(*args, **kwargs)
        if not session.get("authenticated") or session.get("pending_2fa"):
            return jsonify({"error": "Not authenticated"}), 401
        return f(*args, **kwargs)
    return decorated

RESERVED_KEYS = {"_folders_meta", "_notes", "_files", "_trash"}

def validate_website(website):
    if not website or len(website) > MAX_WEBSITE_LENGTH:
        return False
    if website.lower() in RESERVED_KEYS:
        return False
    if not re.match(r'^[\w\s.\-:/@?#%&=+~!,;()\[\]\'*]+$', website):
        return False
    return True

def validate_folder(folder):
    if folder is None:
        return None
    if not isinstance(folder, str):
        return "Folder must be a string"
    folder = folder.strip()
    if not folder:
        return None
    if len(folder) > MAX_FOLDER_NAME_LENGTH:
        return f"Folder name must be at most {MAX_FOLDER_NAME_LENGTH} characters"
    if not re.match(r'^[\w\s.\-]+$', folder):
        return "Folder name contains invalid characters"
    return None

def validate_notes_field(notes):
    if notes is None:
        return None
    if not isinstance(notes, str):
        return "Notes must be a string"
    if len(notes) > MAX_NOTES_FIELD_LENGTH:
        return f"Notes must be at most {MAX_NOTES_FIELD_LENGTH} characters"
    return None

def validate_recovery_questions(questions):
    if questions is None:
        return None
    if not isinstance(questions, list):
        return "Recovery questions must be an array"
    if len(questions) > MAX_RECOVERY_QUESTIONS:
        return f"Maximum of {MAX_RECOVERY_QUESTIONS} recovery questions"
    sanitized = []
    for i, q in enumerate(questions):
        if not isinstance(q, dict):
            return f"Recovery question {i+1} must be an object"
        if not q.get("question") or not isinstance(q["question"], str):
            return f"Recovery question {i+1} must have a question string"
        if not q.get("answer") or not isinstance(q["answer"], str):
            return f"Recovery question {i+1} must have an answer string"
        if len(q["question"]) > MAX_RECOVERY_Q_LENGTH:
            return f"Recovery question {i+1} question is too long (max {MAX_RECOVERY_Q_LENGTH})"
        if len(q["answer"]) > MAX_RECOVERY_Q_LENGTH:
            return f"Recovery question {i+1} answer is too long (max {MAX_RECOVERY_Q_LENGTH})"
        sanitized.append({"question": q["question"], "answer": q["answer"]})
    questions[:] = sanitized
    return None

def count_existing_folders(passwords):
    folders = set()
    for key, entries in passwords.items():
        if key == "_trash":
            continue
        if key == "_folders_meta":
            if isinstance(entries, list):
                folders.update(entries)
            continue
        if key == "_notes":
            if isinstance(entries, dict):
                for title, note_entries in entries.items():
                    for entry in (note_entries if isinstance(note_entries, list) else [note_entries]):
                        if isinstance(entry, dict) and entry.get("folder"):
                            folders.add(entry["folder"])
            continue
        if key == "_files":
            if isinstance(entries, dict):
                for label, file_entries in entries.items():
                    for entry in (file_entries if isinstance(file_entries, list) else [file_entries]):
                        if isinstance(entry, dict) and entry.get("folder"):
                            folders.add(entry["folder"])
            continue
        for entry in (entries if isinstance(entries, list) else [entries]):
            if entry.get("folder"):
                folders.add(entry["folder"])
    return folders

def get_session_material():
    from flask import g
    if getattr(g, 'is_token_auth', False):
        return g.token_auth["vault_key"], g.token_auth["salt"], current_app.config["VAULT_FILE"]
    key_raw = _decrypt_session_value(session["vault_key"])
    salt = _decrypt_session_value(session["salt"])
    vault_path = current_app.config["VAULT_FILE"]
    return key_raw, salt, vault_path

def get_vault_data():
    try:
        key_raw, _, vault_path = get_session_material()
        passwords = load_passwords_with_key(key_raw, vault_path)
        return key_raw, vault_path, passwords
    except Exception as e:
        logger.error("Failed to load vault data: %s", e)
        return None, None, None

def save_vault(key_raw, salt, vault_path, passwords):
    save_passwords_with_key(key_raw, salt, passwords, vault_path)

@vault_bp.route("/", methods=["GET"])
@require_auth
def get_all():
    _, _, passwords = get_vault_data()
    if passwords is None:
        return jsonify({"error": "Failed to decrypt vault. Please log in again."}), 500
    notes_data = passwords.get("_notes", {})
    filtered = {k: v for k, v in passwords.items() if k not in RESERVED_KEYS}
    all_folders = sorted(count_existing_folders(passwords))
    files_data = passwords.get("_files", {})
    return jsonify({"passwords": filtered, "notes": notes_data, "files": files_data, "folders": all_folders, "trash_count": len(passwords.get("_trash", []))})

@vault_bp.route("/", methods=["POST"])
@require_auth
def add_entry():
    data = request.get_json()
    if not data or not data.get("website"):
        return jsonify({"error": "Website is required"}), 400
    if not isinstance(data.get("website"), str):
        return jsonify({"error": "Website must be a string"}), 400
    if data.get("username") is not None and not isinstance(data["username"], str):
        return jsonify({"error": "Username must be a string"}), 400
    if data.get("password") is not None and not isinstance(data["password"], str):
        return jsonify({"error": "Password must be a string"}), 400

    website = data["website"].strip().lower()
    username = data.get("username", "").strip()
    password = data.get("password") or generate_password()
    folder = data.get("folder")
    if folder is not None:
        if not isinstance(folder, str):
            return jsonify({"error": "Folder must be a string"}), 400
        folder = folder.strip() or None

    if not validate_website(website):
        return jsonify({"error": "Invalid website name"}), 400
    if username and len(username) > MAX_USERNAME_LENGTH:
        return jsonify({"error": f"Username must be at most {MAX_USERNAME_LENGTH} characters"}), 400
    if len(password) > MAX_PASSWORD_LENGTH:
        return jsonify({"error": f"Password must be at most {MAX_PASSWORD_LENGTH} characters"}), 400
    folder_err = validate_folder(folder)
    if folder_err:
        return jsonify({"error": folder_err}), 400

    notes = data.get("notes")
    notes_err = validate_notes_field(notes)
    if notes_err:
        return jsonify({"error": notes_err}), 400

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

            total_entries = sum(
                len(v) if isinstance(v, list) else 1
                for k, v in passwords.items() if k not in RESERVED_KEYS
            )
            notes_data = passwords.get("_notes", {})
            if isinstance(notes_data, dict):
                total_entries += sum(
                    len(v) if isinstance(v, list) else 1
                    for v in notes_data.values()
                )
            files_data = passwords.get("_files", {})
            if isinstance(files_data, dict):
                total_entries += sum(
                    len(v) if isinstance(v, list) else 1
                    for v in files_data.values()
                )
            if total_entries >= MAX_TOTAL_ENTRIES:
                return jsonify({"error": "Vault entry limit reached"}), 400

            if folder:
                existing_folders = count_existing_folders(passwords)
                if folder not in existing_folders and len(existing_folders) >= MAX_FOLDERS:
                    return jsonify({"error": f"Maximum of {MAX_FOLDERS} folders reached"}), 400

            if website not in passwords:
                passwords[website] = []

            passwords[website] = normalize_entries(passwords[website])
            if len(passwords[website]) >= MAX_ENTRIES_PER_SITE:
                return jsonify({"error": "Too many entries for this website"}), 400

            # Check for duplicate entry (same username and password)
            for existing in passwords[website]:
                existing_username = existing.get("username", "")
                if existing_username == username and existing.get("password") == password:
                    return jsonify({"error": "This credential already exists in your vault"}), 409

            entry = {"password": password}
            if username:
                entry["username"] = username
            if folder:
                entry["folder"] = folder
            if notes:
                entry["notes"] = notes
            if recovery_questions:
                entry["recovery_questions"] = recovery_questions
            if data.get("pinned") is True:
                entry["pinned"] = True
            passwords[website].append(entry)
            save_vault(key_raw, salt, vault_path, passwords)
    except Exception as e:
        logger.error("Failed to update vault data: %s", e)
        return jsonify({"error": "Failed to decrypt vault. Please log in again."}), 500

    return jsonify({"success": True, "password": password}), 201

@vault_bp.route("/<int:index>/<path:website>", methods=["DELETE"])
@require_auth
def delete_entry(index, website):
    website = website.lower()
    if not validate_website(website):
        return jsonify({"error": "Invalid website name"}), 400

    try:
        key_raw, salt, vault_path = get_session_material()
    except Exception as e:
        logger.error("Failed to load vault session data: %s", e)
        return jsonify({"error": "Failed to decrypt vault. Please log in again."}), 500

    try:
        with FileLock(vault_path + ".lock"):
            passwords = load_passwords_with_key(key_raw, vault_path)

            if website not in passwords:
                return jsonify({"error": "Website not found"}), 404

            entries = normalize_entries(passwords[website])

            if index < 0 or index >= len(entries):
                return jsonify({"error": "Invalid index"}), 400

            popped_entry = entries.pop(index)
            from backend.routes.trash_routes import create_trash_item
            trash_item = create_trash_item("password", website, popped_entry)
            passwords.setdefault("_trash", []).append(trash_item)

            if not entries:
                del passwords[website]
            else:
                passwords[website] = entries

            save_vault(key_raw, salt, vault_path, passwords)
    except Exception as e:
        logger.error("Failed to update vault data: %s", e)
        return jsonify({"error": "Failed to decrypt vault. Please log in again."}), 500

    return jsonify({"success": True})

@vault_bp.route("/<int:index>/<path:website>", methods=["PUT"])
@require_auth
def edit_entry(index, website):
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    website = website.lower()
    if not validate_website(website):
        return jsonify({"error": "Invalid website name"}), 400

    try:
        key_raw, salt, vault_path = get_session_material()
    except Exception as e:
        logger.error("Failed to load vault session data: %s", e)
        return jsonify({"error": "Failed to decrypt vault. Please log in again."}), 500

    try:
        with FileLock(vault_path + ".lock"):
            passwords = load_passwords_with_key(key_raw, vault_path)

            if website not in passwords:
                return jsonify({"error": "Website not found"}), 404

            entries = normalize_entries(passwords[website])

            if index < 0 or index >= len(entries):
                return jsonify({"error": "Invalid index"}), 400

            if "username" in data:
                if not isinstance(data["username"], str):
                    return jsonify({"error": "Username must be a string"}), 400
                username = data["username"].strip()
                if len(username) > MAX_USERNAME_LENGTH:
                    return jsonify({"error": f"Username must be at most {MAX_USERNAME_LENGTH} characters"}), 400
                if username:
                    entries[index]["username"] = username
                else:
                    entries[index].pop("username", None)
            if "password" in data:
                if not isinstance(data["password"], str):
                    return jsonify({"error": "Password must be a string"}), 400
                password = data["password"]
                if not password:
                    return jsonify({"error": "Password cannot be empty"}), 400
                if len(password) > MAX_PASSWORD_LENGTH:
                    return jsonify({"error": f"Password must be at most {MAX_PASSWORD_LENGTH} characters"}), 400
                old_password = entries[index].get("password", "")
                if password != old_password:
                    history = entries[index].get("history", [])
                    history.append({
                        "password": old_password,
                        "changed_at": datetime.now(timezone.utc).isoformat(),
                    })
                    if len(history) > MAX_PASSWORD_HISTORY:
                        history = history[-MAX_PASSWORD_HISTORY:]
                    entries[index]["history"] = history
                entries[index]["password"] = password
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

            if "notes" in data:
                notes = data["notes"]
                notes_err = validate_notes_field(notes)
                if notes_err:
                    return jsonify({"error": notes_err}), 400
                if notes:
                    entries[index]["notes"] = notes
                else:
                    entries[index].pop("notes", None)

            if "recovery_questions" in data:
                rq = data["recovery_questions"]
                rq_err = validate_recovery_questions(rq)
                if rq_err:
                    return jsonify({"error": rq_err}), 400
                if rq:
                    entries[index]["recovery_questions"] = rq
                else:
                    entries[index].pop("recovery_questions", None)

            if "pinned" in data:
                pinned = data["pinned"]
                if not isinstance(pinned, bool):
                    return jsonify({"error": "Pinned must be a boolean"}), 400
                if pinned:
                    entries[index]["pinned"] = True
                else:
                    entries[index].pop("pinned", None)

            passwords[website] = entries
            save_vault(key_raw, salt, vault_path, passwords)
    except Exception as e:
        logger.error("Failed to update vault data: %s", e)
        return jsonify({"error": "Failed to decrypt vault. Please log in again."}), 500

    return jsonify({"success": True})

@vault_bp.route("/<int:index>/<path:website>/history", methods=["GET"])
@require_auth
def get_password_history(index, website):
    website = website.lower()
    if not validate_website(website):
        return jsonify({"error": "Invalid website name"}), 400

    _, _, passwords = get_vault_data()
    if passwords is None:
        return jsonify({"error": "Failed to decrypt vault. Please log in again."}), 500

    if website not in passwords:
        return jsonify({"error": "Website not found"}), 404

    entries = normalize_entries(passwords[website])

    if index < 0 or index >= len(entries):
        return jsonify({"error": "Invalid index"}), 400

    history = entries[index].get("history", [])
    return jsonify({"history": history})

@vault_bp.route("/pin", methods=["PUT"])
@require_auth
def pin_entry():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    entry_type = data.get("type")
    if entry_type not in ("password", "note", "file"):
        return jsonify({"error": "Type must be 'password', 'note', or 'file'"}), 400

    key = data.get("key")
    if not key or not isinstance(key, str):
        return jsonify({"error": "Key must be a non-empty string"}), 400

    index = data.get("index")
    if not isinstance(index, int) or index < 0:
        return jsonify({"error": "Index must be a non-negative integer"}), 400

    pinned = data.get("pinned")
    if not isinstance(pinned, bool):
        return jsonify({"error": "Pinned must be a boolean"}), 400

    try:
        key_raw, salt, vault_path = get_session_material()
    except Exception as e:
        logger.error("Failed to load vault session data: %s", e)
        return jsonify({"error": "Failed to decrypt vault. Please log in again."}), 500

    try:
        with FileLock(vault_path + ".lock"):
            passwords = load_passwords_with_key(key_raw, vault_path)

            if entry_type == "password":
                lookup_key = key.lower()
                if lookup_key not in passwords:
                    return jsonify({"error": "Entry not found"}), 404
                entries = normalize_entries(passwords[lookup_key])
                if index >= len(entries):
                    return jsonify({"error": "Invalid index"}), 400
                entry = entries[index]
                if pinned:
                    entry["pinned"] = True
                else:
                    entry.pop("pinned", None)
                passwords[lookup_key] = entries
            elif entry_type == "note":
                notes_data = passwords.get("_notes", {})
                if not isinstance(notes_data, dict) or key not in notes_data:
                    return jsonify({"error": "Entry not found"}), 404
                entries = notes_data[key]
                if not isinstance(entries, list):
                    entries = [entries]
                if index >= len(entries):
                    return jsonify({"error": "Invalid index"}), 400
                entry = entries[index]
                if pinned:
                    entry["pinned"] = True
                else:
                    entry.pop("pinned", None)
                notes_data[key] = entries
                passwords["_notes"] = notes_data
            elif entry_type == "file":
                files_data = passwords.get("_files", {})
                if not isinstance(files_data, dict) or key not in files_data:
                    return jsonify({"error": "Entry not found"}), 404
                entries = files_data[key]
                if not isinstance(entries, list):
                    entries = [entries]
                if index >= len(entries):
                    return jsonify({"error": "Invalid index"}), 400
                entry = entries[index]
                if pinned:
                    entry["pinned"] = True
                else:
                    entry.pop("pinned", None)
                files_data[key] = entries
                passwords["_files"] = files_data

            save_vault(key_raw, salt, vault_path, passwords)
    except Exception as e:
        logger.error("Failed to update vault data: %s", e)
        return jsonify({"error": "Failed to decrypt vault. Please log in again."}), 500

    return jsonify({"success": True})