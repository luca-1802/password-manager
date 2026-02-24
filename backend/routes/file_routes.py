import os
import uuid
import logging
from datetime import datetime, timezone
from filelock import FileLock
from flask import Blueprint, request, jsonify, current_app, send_file
from backend.routes.vault_routes import (
    require_auth, get_session_material, save_vault,
    validate_website, validate_folder,
    count_existing_folders,
    RESERVED_KEYS, MAX_TOTAL_ENTRIES, MAX_FOLDERS,
    MAX_FILE_SIZE, MAX_FILES, MAX_FILES_PER_LABEL,
    MAX_FILE_DESCRIPTION_LENGTH,
)
from backend.vault import load_passwords_with_key, encrypt_file, decrypt_file, VaultDecryptionError

logger = logging.getLogger(__name__)

file_bp = Blueprint("files", __name__)


def _get_files_dir():
    vault_path = current_app.config["VAULT_FILE"]
    files_dir = os.path.join(os.path.dirname(vault_path), "files")
    if not os.path.exists(files_dir):
        os.makedirs(files_dir, mode=0o700, exist_ok=True)
    return files_dir


def _count_total_files(passwords):
    files_data = passwords.get("_files", {})
    if not isinstance(files_data, dict):
        return 0
    total = 0
    for label, entries in files_data.items():
        if isinstance(entries, list):
            total += len(entries)
        else:
            total += 1
    return total


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


@file_bp.route("/", methods=["POST"])
@require_auth
def upload_file():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]
    if not file.filename:
        return jsonify({"error": "No file selected"}), 400

    label = request.form.get("label", "").strip().lower()
    if not label:
        return jsonify({"error": "Label is required"}), 400
    if not validate_website(label):
        return jsonify({"error": "Invalid label name"}), 400

    description = request.form.get("description", "").strip()
    if len(description) > MAX_FILE_DESCRIPTION_LENGTH:
        return jsonify({"error": f"Description must be at most {MAX_FILE_DESCRIPTION_LENGTH} characters"}), 400

    folder = request.form.get("folder", "").strip() or None
    folder_err = validate_folder(folder)
    if folder_err:
        return jsonify({"error": folder_err}), 400

    file_content = file.read()
    if len(file_content) > MAX_FILE_SIZE:
        return jsonify({"error": "File too large (max 5 MB)"}), 400
    if len(file_content) == 0:
        return jsonify({"error": "File is empty"}), 400

    original_name = file.filename
    if len(original_name) > 255:
        original_name = original_name[:255]

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

            total_files = _count_total_files(passwords)
            if total_files >= MAX_FILES:
                return jsonify({"error": f"Maximum of {MAX_FILES} files reached"}), 400

            if folder:
                existing_folders = count_existing_folders(passwords)
                if folder not in existing_folders and len(existing_folders) >= MAX_FOLDERS:
                    return jsonify({"error": f"Maximum of {MAX_FOLDERS} folders reached"}), 400

            files_data = passwords.get("_files", {})
            if not isinstance(files_data, dict):
                files_data = {}

            if label not in files_data:
                files_data[label] = []
            if not isinstance(files_data[label], list):
                files_data[label] = [files_data[label]]
            if len(files_data[label]) >= MAX_FILES_PER_LABEL:
                return jsonify({"error": "Too many files for this label"}), 400

            file_id = uuid.uuid4().hex
            encrypted_data = encrypt_file(key_raw, file_content)

            files_dir = _get_files_dir()
            enc_path = os.path.join(files_dir, f"{file_id}.enc")

            real_path = os.path.realpath(enc_path)
            real_dir = os.path.realpath(files_dir)
            if not real_path.startswith(real_dir + os.sep):
                return jsonify({"error": "Invalid file path"}), 400

            tmp_path = enc_path + ".tmp"
            try:
                fd = os.open(tmp_path, os.O_CREAT | os.O_WRONLY | os.O_TRUNC, 0o600)
                with os.fdopen(fd, "wb") as f:
                    f.write(encrypted_data)
                os.replace(tmp_path, enc_path)
            except OSError as e:
                logger.error("Could not write encrypted file: %s", e)
                try:
                    os.remove(tmp_path)
                except OSError:
                    pass
                return jsonify({"error": "Failed to save file"}), 500

            entry = {
                "type": "file",
                "file_id": file_id,
                "original_name": original_name,
                "size": len(file_content),
                "uploaded_at": datetime.now(timezone.utc).isoformat(),
            }
            if description:
                entry["description"] = description
            if folder:
                entry["folder"] = folder

            files_data[label].append(entry)
            passwords["_files"] = files_data
            save_vault(key_raw, salt, vault_path, passwords)
    except Exception as e:
        logger.error("Failed to update vault data: %s", e)
        return jsonify({"error": "Failed to decrypt vault. Please log in again."}), 500

    return jsonify({"success": True, "file_id": file_id}), 201


@file_bp.route("/<int:index>/<path:label>/download", methods=["GET"])
@require_auth
def download_file(index, label):
    label = label.lower()
    if not validate_website(label):
        return jsonify({"error": "Invalid label name"}), 400

    try:
        key_raw, salt, vault_path = get_session_material()
    except Exception as e:
        logger.error("Failed to load vault session data: %s", e)
        return jsonify({"error": "Failed to decrypt vault. Please log in again."}), 500

    try:
        passwords = load_passwords_with_key(key_raw, vault_path)
        files_data = passwords.get("_files", {})
        if not isinstance(files_data, dict) or label not in files_data:
            return jsonify({"error": "File not found"}), 404

        entries = files_data[label]
        if not isinstance(entries, list):
            entries = [entries]
        if index < 0 or index >= len(entries):
            return jsonify({"error": "Invalid index"}), 400

        entry = entries[index]
        file_id = entry.get("file_id")
        original_name = entry.get("original_name", "download")

        if not file_id:
            return jsonify({"error": "File data is corrupted"}), 500

        files_dir = _get_files_dir()
        enc_path = os.path.join(files_dir, f"{file_id}.enc")

        real_path = os.path.realpath(enc_path)
        real_dir = os.path.realpath(files_dir)
        if not real_path.startswith(real_dir + os.sep):
            return jsonify({"error": "Invalid file path"}), 400

        if not os.path.exists(enc_path):
            return jsonify({"error": "Encrypted file not found on disk"}), 404

        with open(enc_path, "rb") as f:
            encrypted_data = f.read()

        decrypted = decrypt_file(key_raw, encrypted_data)

        import io
        response = send_file(
            io.BytesIO(decrypted),
            as_attachment=True,
            download_name=original_name,
            mimetype="application/octet-stream",
        )
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Content-Security-Policy"] = "default-src 'none'"
        return response
    except VaultDecryptionError as e:
        logger.error("Failed to decrypt file: %s", e)
        return jsonify({"error": "Failed to decrypt file"}), 500
    except Exception as e:
        logger.error("Failed to download file: %s", e)
        return jsonify({"error": "Failed to download file"}), 500


@file_bp.route("/<int:index>/<path:label>", methods=["PUT"])
@require_auth
def edit_file(index, label):
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    label = label.lower()
    if not validate_website(label):
        return jsonify({"error": "Invalid label name"}), 400

    try:
        key_raw, salt, vault_path = get_session_material()
    except Exception as e:
        logger.error("Failed to load vault session data: %s", e)
        return jsonify({"error": "Failed to decrypt vault. Please log in again."}), 500

    try:
        with FileLock(vault_path + ".lock"):
            passwords = load_passwords_with_key(key_raw, vault_path)

            files_data = passwords.get("_files", {})
            if not isinstance(files_data, dict) or label not in files_data:
                return jsonify({"error": "File not found"}), 404

            entries = files_data[label]
            if not isinstance(entries, list):
                entries = [entries]
            if index < 0 or index >= len(entries):
                return jsonify({"error": "Invalid index"}), 400

            if "description" in data:
                desc = data["description"]
                if desc is not None:
                    if not isinstance(desc, str):
                        return jsonify({"error": "Description must be a string"}), 400
                    if len(desc) > MAX_FILE_DESCRIPTION_LENGTH:
                        return jsonify({"error": f"Description must be at most {MAX_FILE_DESCRIPTION_LENGTH} characters"}), 400
                    entries[index]["description"] = desc
                else:
                    entries[index].pop("description", None)

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

            files_data[label] = entries
            passwords["_files"] = files_data
            save_vault(key_raw, salt, vault_path, passwords)
    except Exception as e:
        logger.error("Failed to update vault data: %s", e)
        return jsonify({"error": "Failed to decrypt vault. Please log in again."}), 500

    return jsonify({"success": True})


@file_bp.route("/<int:index>/<path:label>", methods=["DELETE"])
@require_auth
def delete_file(index, label):
    label = label.lower()
    if not validate_website(label):
        return jsonify({"error": "Invalid label name"}), 400

    try:
        key_raw, salt, vault_path = get_session_material()
    except Exception as e:
        logger.error("Failed to load vault session data: %s", e)
        return jsonify({"error": "Failed to decrypt vault. Please log in again."}), 500

    try:
        with FileLock(vault_path + ".lock"):
            passwords = load_passwords_with_key(key_raw, vault_path)

            files_data = passwords.get("_files", {})
            if not isinstance(files_data, dict) or label not in files_data:
                return jsonify({"error": "File not found"}), 404

            entries = files_data[label]
            if not isinstance(entries, list):
                entries = [entries]
            if index < 0 or index >= len(entries):
                return jsonify({"error": "Invalid index"}), 400

            entry = entries[index]
            file_id = entry.get("file_id")

            if file_id:
                files_dir = _get_files_dir()
                enc_path = os.path.join(files_dir, f"{file_id}.enc")
                real_path = os.path.realpath(enc_path)
                real_dir = os.path.realpath(files_dir)
                if real_path.startswith(real_dir + os.sep) and os.path.exists(enc_path):
                    try:
                        os.remove(enc_path)
                    except OSError as e:
                        logger.warning("Could not delete encrypted file %s: %s", file_id, e)

            entries.pop(index)
            if not entries:
                del files_data[label]
            else:
                files_data[label] = entries

            if files_data:
                passwords["_files"] = files_data
            else:
                passwords.pop("_files", None)

            save_vault(key_raw, salt, vault_path, passwords)
    except Exception as e:
        logger.error("Failed to update vault data: %s", e)
        return jsonify({"error": "Failed to decrypt vault. Please log in again."}), 500

    return jsonify({"success": True})
