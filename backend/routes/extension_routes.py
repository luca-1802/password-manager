import json
import logging
import os
import time

import pyotp
from filelock import FileLock
from flask import Blueprint, request, jsonify, current_app

from backend.vault import (
    load_passwords, load_totp_data, save_totp_data,
    check_lockout, record_failed_attempt, clear_lockout, has_totp,
)
from backend.token_store import (
    create_token, validate_token, validate_pending_token,
    upgrade_token, revoke_token,
)

logger = logging.getLogger(__name__)
extension_bp = Blueprint("extension", __name__)

def _load_used_codes(path):
    if not os.path.exists(path):
        return []
    try:
        with open(path, "r") as f:
            return json.load(f)
    except (OSError, json.JSONDecodeError):
        return []

def _save_used_codes(path, entries):
    tmp_path = path + ".tmp"
    try:
        with open(tmp_path, "w") as f:
            json.dump(entries, f)
        os.replace(tmp_path, path)
    except OSError as e:
        logger.error("Could not write used TOTP codes file: %s", e)

def _check_and_record_totp_code(code):
    used_codes_path = current_app.config["TOTP_USED_CODES_FILE"]
    lock = FileLock(used_codes_path + ".lock")
    now = time.time()
    with lock:
        entries = _load_used_codes(used_codes_path)
        entries = [[c, t] for c, t in entries if now - t < 120]
        for c, t in entries:
            if c == code:
                _save_used_codes(used_codes_path, entries)
                return True
        entries.append([code, now])
        _save_used_codes(used_codes_path, entries)
        return False

def _extract_bearer_token():
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header[7:]
    return None

@extension_bp.route("/login", methods=["POST"])
def ext_login():
    vault_path = current_app.config["VAULT_FILE"]
    totp_path = current_app.config["TOTP_FILE"]
    lockout_path = current_app.config["LOCKOUT_FILE"]
    max_attempts = current_app.config["MAX_LOGIN_ATTEMPTS"]

    is_locked, remaining = check_lockout(lockout_path)
    if is_locked:
        return jsonify({"error": "Vault is locked", "locked_until": remaining}), 423

    if not os.path.exists(vault_path):
        return jsonify({"error": "Vault is not initialized. Create a vault first."}), 400

    data = request.get_json()
    if not data or not data.get("master_password"):
        return jsonify({"error": "Master password is required"}), 400

    master_pwd = data["master_password"]
    if not isinstance(master_pwd, str):
        return jsonify({"error": "Master password must be a string"}), 400

    salt, passwords, key_raw = load_passwords(master_pwd, vault_path)
    del master_pwd

    if passwords is None:
        locked, lockout_seconds = record_failed_attempt(lockout_path, max_attempts)
        if locked:
            return jsonify({"error": "Too many failed attempts", "locked_until": lockout_seconds}), 423
        return jsonify({"error": "Invalid password"}), 401

    clear_lockout(lockout_path)

    if has_totp(totp_path):
        token = create_token(key_raw, salt, pending_2fa=True)
        return jsonify({"requires_2fa": True, "pending_token": token})

    token = create_token(key_raw, salt)
    return jsonify({"success": True, "token": token})

@extension_bp.route("/2fa/verify", methods=["POST"])
def ext_2fa_verify():
    data = request.get_json()
    if not data or not data.get("pending_token") or not data.get("code"):
        return jsonify({"error": "Pending token and code are required"}), 400

    pending_token = data["pending_token"]
    code = str(data["code"]).strip()

    if code.isdigit() and len(code) == 6:
        pass
    elif code.isalnum() and len(code) == 8:
        pass
    else:
        return jsonify({"error": "Code must be a 6-digit TOTP code or 8-character backup code"}), 400

    material = validate_pending_token(pending_token)
    if material is None:
        return jsonify({"error": "Invalid or expired pending token"}), 401

    lockout_path = current_app.config["TOTP_LOCKOUT_FILE"]
    locked, remaining = check_lockout(lockout_path)
    if locked:
        return jsonify({"error": "Too many failed attempts", "locked_until": remaining}), 423

    vault_key = material["vault_key"]
    salt = material["salt"]

    totp_path = current_app.config["TOTP_FILE"]
    totp_data = load_totp_data(vault_key, totp_path)
    if not totp_data:
        return jsonify({"error": "2FA configuration error"}), 500

    max_2fa_attempts = current_app.config.get("MAX_2FA_ATTEMPTS", 5)

    if code.isdigit() and len(code) == 6:
        totp = pyotp.TOTP(totp_data["secret"])
        if not totp.verify(code, valid_window=1):
            locked, lockout_seconds = record_failed_attempt(lockout_path, max_2fa_attempts)
            if locked:
                return jsonify({"error": "Too many failed attempts", "locked_until": lockout_seconds}), 423
            return jsonify({"error": "Invalid code"}), 403
        if _check_and_record_totp_code(code):
            return jsonify({"error": "Code already used, wait for a new code"}), 403
    else:
        backup_valid = False
        totp_lock = FileLock(totp_path + ".lock")
        with totp_lock:
            totp_data = load_totp_data(vault_key, totp_path)
            if not totp_data:
                return jsonify({"error": "2FA configuration error"}), 500
            backup_codes = totp_data.get("backup_codes", [])
            code_lower = code.lower()
            if code_lower in backup_codes:
                backup_codes.remove(code_lower)
                totp_data["backup_codes"] = backup_codes
                try:
                    save_totp_data(vault_key, salt, totp_data, totp_path)
                    backup_valid = True
                except Exception as e:
                    logger.error("Failed to consume backup code: %s", e)
                    return jsonify({"error": "Failed to verify code, please try again"}), 500

        if not backup_valid:
            locked, lockout_seconds = record_failed_attempt(lockout_path, max_2fa_attempts)
            if locked:
                return jsonify({"error": "Too many failed attempts", "locked_until": lockout_seconds}), 423
            return jsonify({"error": "Invalid backup code"}), 403

    clear_lockout(lockout_path)
    new_token = upgrade_token(pending_token, vault_key, salt)
    return jsonify({"success": True, "token": new_token})

@extension_bp.route("/status", methods=["GET"])
def ext_status():
    token = _extract_bearer_token()
    if not token:
        return jsonify({"error": "Authorization header required"}), 401

    material = validate_token(token)
    if material is None:
        return jsonify({"error": "Invalid or expired token"}), 401

    return jsonify({"authenticated": True})

@extension_bp.route("/logout", methods=["POST"])
def ext_logout():
    token = _extract_bearer_token()
    if not token:
        return jsonify({"error": "Authorization header required"}), 401

    revoke_token(token)
    return jsonify({"success": True})