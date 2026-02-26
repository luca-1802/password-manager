import logging
from flask import Blueprint, request, jsonify, current_app
from filelock import FileLock
from backend.routes.vault_routes import require_auth, get_session_material
from backend.vault import load_passwords_with_key, load_totp_data, VaultDecryptionError
from backend.backup import list_backups, restore_backup, resolve_backup_path

logger = logging.getLogger(__name__)

backup_bp = Blueprint("backup", __name__)

@backup_bp.route("/", methods=["GET"])
@require_auth
def get_backups():
    vault_path = current_app.config["VAULT_FILE"]
    totp_path = current_app.config["TOTP_FILE"]

    vault_backups = list_backups(vault_path)
    totp_backups = list_backups(totp_path)

    for b in vault_backups:
        b.pop("path", None)
    for b in totp_backups:
        b.pop("path", None)

    return jsonify({
        "vault_backups": vault_backups,
        "totp_backups": totp_backups,
    })

@backup_bp.route("/restore", methods=["POST"])
@require_auth
def restore_from_backup():
    data = request.get_json()
    if not data or not data.get("filename"):
        return jsonify({"error": "Backup filename is required"}), 400

    filename = data["filename"]
    target = data.get("target", "vault")

    if target not in ("vault", "totp"):
        return jsonify({"error": "Target must be 'vault' or 'totp'"}), 400

    if not isinstance(filename, str) or "/" in filename or "\\" in filename:
        return jsonify({"error": "Invalid backup filename"}), 400

    try:
        key_raw, salt, vault_path = get_session_material()
    except Exception as e:
        logger.error("Session error during restore: %s", e)
        return jsonify({"error": "Session error. Please log in again."}), 500

    file_path = vault_path if target == "vault" else current_app.config["TOTP_FILE"]

    try:
        with FileLock(file_path + ".lock"):
            backup_path = resolve_backup_path(filename, file_path)

            if target == "vault":
                load_passwords_with_key(key_raw, backup_path)
            else:
                totp_result = load_totp_data(key_raw, backup_path)
                if totp_result is None:
                    return jsonify({"error": "Backup cannot be decrypted with current key"}), 409

            restore_backup(filename, file_path)
    except VaultDecryptionError:
        return jsonify({"error": "Backup cannot be decrypted with current key"}), 409
    except FileNotFoundError:
        return jsonify({"error": "Backup file not found"}), 404
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        logger.error("Restore failed: %s", e)
        return jsonify({"error": "Failed to restore from backup"}), 500

    return jsonify({"success": True})