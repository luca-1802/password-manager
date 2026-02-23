import os
import re
import time
import base64
import logging
from flask import Blueprint, request, jsonify, session, current_app
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from filelock import FileLock
from backend.vault import derive_key, load_passwords, load_passwords_with_key, save_passwords_with_key, load_totp_data, save_totp_data, check_lockout, record_failed_attempt, clear_lockout, has_totp, SALT_SIZE
from backend.config import get_session_encryption_key

logger = logging.getLogger(__name__)
auth_bp = Blueprint("auth", __name__)

_NONCE_SIZE = 12

def _encrypt_session_value(value_bytes):
    key = get_session_encryption_key()
    nonce = os.urandom(_NONCE_SIZE)
    ct = AESGCM(key).encrypt(nonce, value_bytes, None)
    return base64.urlsafe_b64encode(nonce + ct).decode()

def _decrypt_session_value(encrypted_str):
    key = get_session_encryption_key()
    raw = base64.urlsafe_b64decode(encrypted_str.encode())
    nonce, ct = raw[:_NONCE_SIZE], raw[_NONCE_SIZE:]
    return AESGCM(key).decrypt(nonce, ct, None)

def validate_master_password(pwd, min_length):
    if len(pwd) < min_length:
        return f"Password must be at least {min_length} characters"
    if len(pwd) > 128:
        return "Password must be at most 128 characters"
    if not re.search(r'[A-Z]', pwd):
        return "Password must contain at least one uppercase letter"
    if not re.search(r'[a-z]', pwd):
        return "Password must contain at least one lowercase letter"
    if not re.search(r'[0-9]', pwd):
        return "Password must contain at least one digit"
    return None

@auth_bp.route("/status", methods=["GET"])
def status():
    vault_path = current_app.config["VAULT_FILE"]
    totp_path = current_app.config["TOTP_FILE"]
    return jsonify({
        "authenticated": session.get("authenticated", False),
        "is_new_vault": not os.path.exists(vault_path),
        "pending_2fa": session.get("pending_2fa", False),
        "totp_enabled": has_totp(totp_path),
    })

@auth_bp.route("/login", methods=["POST"])
def login():
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

    if passwords is None:
        locked, lockout_seconds = record_failed_attempt(lockout_path, max_attempts)
        if locked:
            return jsonify({"error": "Too many failed attempts", "locked_until": lockout_seconds}), 423
        return jsonify({"error": "Invalid password"}), 401

    del master_pwd

    clear_lockout(lockout_path)

    session.clear()
    session["vault_key"] = _encrypt_session_value(key_raw)
    session["salt"] = _encrypt_session_value(salt)
    session["last_active"] = time.time()

    if has_totp(totp_path):
        session["authenticated"] = False
        session["pending_2fa"] = True
        return jsonify({"requires_2fa": True})

    session["authenticated"] = True
    return jsonify({"success": True})

@auth_bp.route("/create", methods=["POST"])
def create():
    vault_path = current_app.config["VAULT_FILE"]
    min_length = current_app.config["MIN_MASTER_PWD_LENGTH"]

    data = request.get_json()
    if not data or not data.get("master_password") or not data.get("confirm"):
        return jsonify({"error": "Password and confirmation are required"}), 400

    master_pwd = data["master_password"]
    confirm = data["confirm"]
    if not isinstance(master_pwd, str) or not isinstance(confirm, str):
        return jsonify({"error": "Password and confirmation must be strings"}), 400

    error = validate_master_password(master_pwd, min_length)
    if error:
        return jsonify({"error": error}), 400

    if master_pwd != confirm:
        return jsonify({"error": "Passwords do not match"}), 400

    try:
        fd = os.open(vault_path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
        os.close(fd)
    except FileExistsError:
        return jsonify({"error": "Vault already exists"}), 400

    try:
        salt = os.urandom(SALT_SIZE)
        key_raw = derive_key(master_pwd, salt)
        save_passwords_with_key(key_raw, salt, {}, vault_path)
    except Exception:
        try:
            os.unlink(vault_path)
        except OSError:
            pass
        raise

    session.clear()
    session["authenticated"] = True
    session["vault_key"] = _encrypt_session_value(key_raw)
    session["salt"] = _encrypt_session_value(salt)
    session["last_active"] = time.time()

    return jsonify({"success": True}), 201

@auth_bp.route("/change-password", methods=["POST"])
def change_password():
    if not session.get("authenticated") or session.get("pending_2fa"):
        return jsonify({"error": "Not authenticated"}), 401

    vault_path = current_app.config["VAULT_FILE"]
    totp_path = current_app.config["TOTP_FILE"]
    min_length = current_app.config["MIN_MASTER_PWD_LENGTH"]

    data = request.get_json()
    if not data or not data.get("current_password") or not data.get("new_password") or not data.get("confirm"):
        return jsonify({"error": "Current password, new password, and confirmation are required"}), 400

    current_password = data["current_password"]
    new_password = data["new_password"]
    confirm = data["confirm"]

    if not isinstance(current_password, str) or not isinstance(new_password, str) or not isinstance(confirm, str):
        return jsonify({"error": "All fields must be strings"}), 400

    if new_password != confirm:
        return jsonify({"error": "Passwords do not match"}), 400

    if new_password == current_password:
        return jsonify({"error": "New password must be different from current password"}), 400

    error = validate_master_password(new_password, min_length)
    if error:
        return jsonify({"error": error}), 400

    salt, passwords, old_key = load_passwords(current_password, vault_path)
    del current_password

    if passwords is None:
        return jsonify({"error": "Current password is incorrect"}), 401

    new_salt = os.urandom(SALT_SIZE)
    new_key = derive_key(new_password, new_salt)
    del new_password

    try:
        with FileLock(vault_path + ".lock"):
            passwords = load_passwords_with_key(old_key, vault_path)
            save_passwords_with_key(new_key, new_salt, passwords, vault_path)
        del passwords
    except Exception as e:
        logger.error("Failed to re-encrypt vault: %s", e)
        return jsonify({"error": "Failed to re-encrypt vault"}), 500

    totp_data = load_totp_data(old_key, totp_path)
    if totp_data is not None:
        save_totp_data(new_key, new_salt, totp_data, totp_path)

    session["vault_key"] = _encrypt_session_value(new_key)
    session["salt"] = _encrypt_session_value(new_salt)
    session["last_active"] = time.time()

    return jsonify({"success": True})

@auth_bp.route("/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"success": True})