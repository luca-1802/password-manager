import io
import json
import base64
import logging
import os
import time
import pyotp
import qrcode
from filelock import FileLock
from flask import Blueprint, request, jsonify, session, current_app
from backend.vault import (
    save_totp_data, load_totp_data, delete_totp_secret,
    has_totp, generate_backup_codes,
    check_lockout, record_failed_attempt, clear_lockout,
)
from backend.routes.auth_routes import _decrypt_session_value, _encrypt_session_value

logger = logging.getLogger(__name__)
totp_bp = Blueprint("totp", __name__)

def _validate_code(data):
    if not data or not data.get("code"):
        return None, (jsonify({"error": "Verification code is required"}), 400)
    code = str(data["code"]).strip()
    if code.isdigit() and len(code) == 6:
        return code, None
    if code.isalnum() and len(code) == 8:
        return code, None
    return None, (jsonify({"error": "Code must be a 6-digit TOTP code or 8-character backup code"}), 400)

def _get_session_keys():
    key_raw = _decrypt_session_value(session["vault_key"])
    salt = _decrypt_session_value(session["salt"])
    return key_raw, salt

def _check_2fa_lockout():
    lockout_path = current_app.config["TOTP_LOCKOUT_FILE"]
    return check_lockout(lockout_path)

def _record_2fa_failure():
    lockout_path = current_app.config["TOTP_LOCKOUT_FILE"]
    max_attempts = current_app.config.get("MAX_2FA_ATTEMPTS", 5)
    return record_failed_attempt(lockout_path, max_attempts)

def _clear_2fa_attempts():
    lockout_path = current_app.config["TOTP_LOCKOUT_FILE"]
    clear_lockout(lockout_path)

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

@totp_bp.route("/status", methods=["GET"])
def totp_status():
    if not session.get("authenticated"):
        return jsonify({"error": "Not authenticated"}), 401
    totp_path = current_app.config["TOTP_FILE"]
    enabled = has_totp(totp_path)
    backup_codes_remaining = 0
    if enabled:
        try:
            key_raw, _ = _get_session_keys()
            totp_data = load_totp_data(key_raw, totp_path)
            if totp_data:
                backup_codes_remaining = len(totp_data.get("backup_codes", []))
        except Exception:
            pass
    return jsonify({"enabled": enabled, "backup_codes_remaining": backup_codes_remaining})

@totp_bp.route("/setup", methods=["POST"])
def totp_setup():
    if not session.get("authenticated"):
        return jsonify({"error": "Not authenticated"}), 401
    totp_path = current_app.config["TOTP_FILE"]
    if has_totp(totp_path):
        return jsonify({"error": "2FA is already enabled"}), 400

    secret = pyotp.random_base32()
    session["pending_totp_secret"] = _encrypt_session_value(secret.encode())

    totp = pyotp.TOTP(secret)
    uri = totp.provisioning_uri(name="vault", issuer_name="PasswordVault")

    try:
        img = qrcode.make(uri)
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        qr_b64 = base64.b64encode(buf.getvalue()).decode()
    except Exception as e:
        logger.error("Failed to generate QR code: %s", e)
        return jsonify({"error": "Failed to generate QR code"}), 500

    return jsonify({
        "secret": secret,
        "uri": uri,
        "qr_code": qr_b64,
    })

@totp_bp.route("/verify-setup", methods=["POST"])
def totp_verify_setup():
    if not session.get("authenticated"):
        return jsonify({"error": "Not authenticated"}), 401

    pending_encrypted = session.get("pending_totp_secret")
    if not pending_encrypted:
        return jsonify({"error": "No pending 2FA setup"}), 400

    try:
        pending_secret = _decrypt_session_value(pending_encrypted).decode()
    except Exception:
        session.pop("pending_totp_secret", None)
        return jsonify({"error": "Invalid setup state"}), 400

    code, err = _validate_code(request.get_json())
    if err:
        return err

    totp = pyotp.TOTP(pending_secret)
    if not totp.verify(code, valid_window=1):
        return jsonify({"error": "Invalid code"}), 403

    backup_codes = generate_backup_codes()
    try:
        key_raw, salt = _get_session_keys()
        totp_path = current_app.config["TOTP_FILE"]
        save_totp_data(key_raw, salt, {
            "secret": pending_secret,
            "backup_codes": backup_codes,
        }, totp_path)
    except Exception as e:
        logger.error("Failed to save TOTP data: %s", e)
        return jsonify({"error": "Failed to enable 2FA"}), 500

    session.pop("pending_totp_secret", None)
    return jsonify({"success": True, "backup_codes": backup_codes})

@totp_bp.route("/verify", methods=["POST"])
def totp_verify_login():
    if not session.get("pending_2fa"):
        return jsonify({"error": "No pending 2FA verification"}), 400

    locked, remaining = _check_2fa_lockout()
    if locked:
        return jsonify({"error": "Too many failed attempts", "locked_until": remaining}), 423

    code, err = _validate_code(request.get_json())
    if err:
        return err

    try:
        key_raw, salt = _get_session_keys()
    except Exception:
        session.clear()
        return jsonify({"error": "Session expired"}), 401

    totp_path = current_app.config["TOTP_FILE"]
    totp_data = load_totp_data(key_raw, totp_path)
    if not totp_data:
        session.clear()
        return jsonify({"error": "2FA configuration error"}), 500

    if code.isdigit() and len(code) == 6:
        totp = pyotp.TOTP(totp_data["secret"])
        if not totp.verify(code, valid_window=1):
            locked, lockout_seconds = _record_2fa_failure()
            if locked:
                return jsonify({"error": "Too many failed attempts", "locked_until": lockout_seconds}), 423
            return jsonify({"error": "Invalid code"}), 403
        if _check_and_record_totp_code(code):
            return jsonify({"error": "Code already used, wait for a new code"}), 403
    else:
        backup_valid = False
        totp_lock = FileLock(totp_path + ".lock")
        with totp_lock:
            totp_data = load_totp_data(key_raw, totp_path)
            if not totp_data:
                session.clear()
                return jsonify({"error": "2FA configuration error"}), 500
            backup_codes = totp_data.get("backup_codes", [])
            code_lower = code.lower()
            if code_lower in backup_codes:
                backup_codes.remove(code_lower)
                totp_data["backup_codes"] = backup_codes
                try:
                    save_totp_data(key_raw, salt, totp_data, totp_path)
                    backup_valid = True
                except Exception as e:
                    logger.error("Failed to consume backup code: %s", e)
                    return jsonify({"error": "Failed to verify code, please try again"}), 500

        if not backup_valid:
            locked, lockout_seconds = _record_2fa_failure()
            if locked:
                return jsonify({"error": "Too many failed attempts", "locked_until": lockout_seconds}), 423
            return jsonify({"error": "Invalid backup code"}), 403

    _clear_2fa_attempts()
    session["authenticated"] = True
    session.pop("pending_2fa", None)
    return jsonify({"success": True})

@totp_bp.route("/disable", methods=["POST"])
def totp_disable():
    if not session.get("authenticated"):
        return jsonify({"error": "Not authenticated"}), 401

    locked, remaining = _check_2fa_lockout()
    if locked:
        return jsonify({"error": "Too many failed attempts", "locked_until": remaining}), 423

    code, err = _validate_code(request.get_json())
    if err:
        return err

    try:
        key_raw, salt = _get_session_keys()
    except Exception:
        return jsonify({"error": "Session error"}), 500

    totp_path = current_app.config["TOTP_FILE"]
    totp_data = load_totp_data(key_raw, totp_path)
    if not totp_data:
        return jsonify({"error": "2FA is not enabled"}), 400

    verified = False
    if code.isdigit() and len(code) == 6:
        totp = pyotp.TOTP(totp_data["secret"])
        if not totp.verify(code, valid_window=1):
            pass
        elif _check_and_record_totp_code(code):
            return jsonify({"error": "Code already used, wait for a new code"}), 403
        else:
            verified = True
    else:
        backup_codes = totp_data.get("backup_codes", [])
        verified = code.lower() in backup_codes
        if verified:
            totp_data["backup_codes"] = [c for c in backup_codes if c != code.lower()]
            save_totp_data(key_raw, salt, totp_data, totp_path)

    if not verified:
        locked, lockout_seconds = _record_2fa_failure()
        if locked:
            return jsonify({"error": "Too many failed attempts", "locked_until": lockout_seconds}), 423
        return jsonify({"error": "Invalid code"}), 403

    _clear_2fa_attempts()

    try:
        delete_totp_secret(totp_path)
    except Exception:
        return jsonify({"error": "Failed to disable 2FA"}), 500

    return jsonify({"success": True})

@totp_bp.route("/backup-codes", methods=["POST"])
def totp_regenerate_backup_codes():
    if not session.get("authenticated"):
        return jsonify({"error": "Not authenticated"}), 401

    locked, remaining = _check_2fa_lockout()
    if locked:
        return jsonify({"error": "Too many failed attempts", "locked_until": remaining}), 423

    code, err = _validate_code(request.get_json())
    if err:
        return err

    try:
        key_raw, salt = _get_session_keys()
    except Exception:
        return jsonify({"error": "Session error"}), 500

    totp_path = current_app.config["TOTP_FILE"]
    totp_data = load_totp_data(key_raw, totp_path)
    if not totp_data:
        return jsonify({"error": "2FA is not enabled"}), 400

    totp = pyotp.TOTP(totp_data["secret"])
    if not totp.verify(code, valid_window=1):
        locked, lockout_seconds = _record_2fa_failure()
        if locked:
            return jsonify({"error": "Too many failed attempts", "locked_until": lockout_seconds}), 423
        return jsonify({"error": "Invalid code"}), 403

    if _check_and_record_totp_code(code):
        return jsonify({"error": "Code already used, wait for a new code"}), 403
    _clear_2fa_attempts()

    backup_codes = generate_backup_codes()
    totp_data["backup_codes"] = backup_codes
    try:
        save_totp_data(key_raw, salt, totp_data, totp_path)
    except Exception as e:
        logger.error("Failed to save backup codes: %s", e)
        return jsonify({"error": "Failed to regenerate backup codes"}), 500

    return jsonify({"success": True, "backup_codes": backup_codes})