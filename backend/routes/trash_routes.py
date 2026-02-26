import os
import uuid
import logging
from datetime import datetime, timezone, timedelta
from filelock import FileLock
from flask import Blueprint, jsonify, current_app
from backend.routes.vault_routes import require_auth, get_session_material, save_vault
from backend.vault import load_passwords_with_key

logger = logging.getLogger(__name__)

trash_bp = Blueprint("trash", __name__)

def create_trash_item(entry_type, original_key, entry):
    now = datetime.now(timezone.utc)
    retention_days = current_app.config.get("TRASH_RETENTION_DAYS", 30)
    return {
        "id": uuid.uuid4().hex[:8],
        "entry_type": entry_type,
        "original_key": original_key,
        "entry": entry,
        "deleted_at": now.isoformat(),
        "expires_at": (now + timedelta(days=retention_days)).isoformat(),
    }

def _purge_expired(passwords):
    trash = passwords.get("_trash", [])
    now = datetime.now(timezone.utc)
    remaining = []
    purged_count = 0
    file_ids_to_delete = []
    for item in trash:
        expires_at = datetime.fromisoformat(item["expires_at"])
        if expires_at <= now:
            purged_count += 1
            if item.get("entry_type") == "file":
                file_id = item.get("entry", {}).get("file_id")
                if file_id:
                    file_ids_to_delete.append(file_id)
        else:
            remaining.append(item)
    passwords["_trash"] = remaining
    return purged_count, file_ids_to_delete

def _get_files_dir():
    vault_path = current_app.config["VAULT_FILE"]
    files_dir = os.path.join(os.path.dirname(vault_path), "files")
    return files_dir

def _delete_physical_file(file_id):
    files_dir = _get_files_dir()
    enc_path = os.path.join(files_dir, f"{file_id}.enc")
    real_path = os.path.realpath(enc_path)
    real_dir = os.path.realpath(files_dir)
    if real_path.startswith(real_dir + os.sep) and os.path.exists(enc_path):
        try:
            os.remove(enc_path)
        except OSError as e:
            logger.warning("Could not delete encrypted file %s: %s", file_id, e)

@trash_bp.route("/", methods=["GET"])
@require_auth
def list_trash():
    try:
        key_raw, salt, vault_path = get_session_material()
    except Exception as e:
        logger.error("Failed to load vault session data: %s", e)
        return jsonify({"error": "Failed to decrypt vault. Please log in again."}), 500

    try:
        with FileLock(vault_path + ".lock"):
            passwords = load_passwords_with_key(key_raw, vault_path)

            purged_count, file_ids_to_delete = _purge_expired(passwords)
            if purged_count > 0:
                for file_id in file_ids_to_delete:
                    _delete_physical_file(file_id)
                save_vault(key_raw, salt, vault_path, passwords)

            items = passwords.get("_trash", [])
            return jsonify({"items": items, "count": len(items)})
    except Exception as e:
        logger.error("Failed to load vault data: %s", e)
        return jsonify({"error": "Failed to decrypt vault. Please log in again."}), 500

@trash_bp.route("/<trash_id>/restore", methods=["POST"])
@require_auth
def restore_item(trash_id):
    try:
        key_raw, salt, vault_path = get_session_material()
    except Exception as e:
        logger.error("Failed to load vault session data: %s", e)
        return jsonify({"error": "Failed to decrypt vault. Please log in again."}), 500

    try:
        with FileLock(vault_path + ".lock"):
            passwords = load_passwords_with_key(key_raw, vault_path)

            trash = passwords.get("_trash", [])
            target = None
            target_index = None
            for i, item in enumerate(trash):
                if item["id"] == trash_id:
                    target = item
                    target_index = i
                    break

            if target is None:
                return jsonify({"error": "Trash item not found"}), 404

            entry_type = target["entry_type"]
            original_key = target["original_key"]
            entry = target["entry"]

            if entry_type == "password":
                passwords.setdefault(original_key, []).append(entry)
            elif entry_type == "note":
                passwords.setdefault("_notes", {}).setdefault(original_key, []).append(entry)
            elif entry_type == "file":
                passwords.setdefault("_files", {}).setdefault(original_key, []).append(entry)

            trash.pop(target_index)
            passwords["_trash"] = trash
            save_vault(key_raw, salt, vault_path, passwords)
    except Exception as e:
        logger.error("Failed to update vault data: %s", e)
        return jsonify({"error": "Failed to decrypt vault. Please log in again."}), 500

    return jsonify({"success": True})

@trash_bp.route("/<trash_id>", methods=["DELETE"])
@require_auth
def delete_item(trash_id):
    try:
        key_raw, salt, vault_path = get_session_material()
    except Exception as e:
        logger.error("Failed to load vault session data: %s", e)
        return jsonify({"error": "Failed to decrypt vault. Please log in again."}), 500

    try:
        with FileLock(vault_path + ".lock"):
            passwords = load_passwords_with_key(key_raw, vault_path)

            trash = passwords.get("_trash", [])
            target = None
            target_index = None
            for i, item in enumerate(trash):
                if item["id"] == trash_id:
                    target = item
                    target_index = i
                    break

            if target is None:
                return jsonify({"error": "Trash item not found"}), 404

            if target["entry_type"] == "file":
                file_id = target.get("entry", {}).get("file_id")
                if file_id:
                    _delete_physical_file(file_id)

            trash.pop(target_index)
            passwords["_trash"] = trash
            save_vault(key_raw, salt, vault_path, passwords)
    except Exception as e:
        logger.error("Failed to update vault data: %s", e)
        return jsonify({"error": "Failed to decrypt vault. Please log in again."}), 500

    return jsonify({"success": True})

@trash_bp.route("/", methods=["DELETE"])
@require_auth
def empty_trash():
    try:
        key_raw, salt, vault_path = get_session_material()
    except Exception as e:
        logger.error("Failed to load vault session data: %s", e)
        return jsonify({"error": "Failed to decrypt vault. Please log in again."}), 500

    try:
        with FileLock(vault_path + ".lock"):
            passwords = load_passwords_with_key(key_raw, vault_path)

            trash = passwords.get("_trash", [])
            purged = len(trash)

            for item in trash:
                if item["entry_type"] == "file":
                    file_id = item.get("entry", {}).get("file_id")
                    if file_id:
                        _delete_physical_file(file_id)

            passwords.pop("_trash", None)
            save_vault(key_raw, salt, vault_path, passwords)
    except Exception as e:
        logger.error("Failed to update vault data: %s", e)
        return jsonify({"error": "Failed to decrypt vault. Please log in again."}), 500

    return jsonify({"success": True, "purged": purged})