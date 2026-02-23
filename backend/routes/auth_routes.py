import os
import re
import time
import logging
from flask import Blueprint, request, jsonify, session, current_app
from cryptography.fernet import Fernet
from backend.vault import generate_key, load_passwords, save_passwords_with_key, check_lockout, record_failed_attempt, clear_lockout, has_totp, SALT_SIZE
from backend.config import get_session_encryption_key

logger = logging.getLogger(__name__)
auth_bp = Blueprint("auth", __name__)

def _encrypt_session_value(value_bytes):
    return Fernet(get_session_encryption_key()).encrypt(value_bytes).decode()

def _decrypt_session_value(encrypted_str):
    return Fernet(get_session_encryption_key()).decrypt(encrypted_str.encode())

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

    salt, passwords = load_passwords(master_pwd, vault_path)

    if passwords is None:
        locked, lockout_seconds = record_failed_attempt(lockout_path, max_attempts)
        if locked:
            return jsonify({"error": "Too many failed attempts", "locked_until": lockout_seconds}), 423
        return jsonify({"error": "Invalid password"}), 401

    clear_lockout(lockout_path)
    fernet_key = generate_key(master_pwd, salt)

    # TODO: Optimize by having load_passwords return the derived key to avoid
    # double key derivation. For now, delete master_pwd to reduce memory exposure.
    del master_pwd

    session.clear()
    session["fernet_key"] = _encrypt_session_value(fernet_key)
    session["salt"] = _encrypt_session_value(salt)
    session["last_active"] = time.time()

    totp_path = current_app.config["TOTP_FILE"]
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
        fernet_key = generate_key(master_pwd, salt)
        save_passwords_with_key(fernet_key, salt, {}, vault_path)
    except Exception:
        try:
            os.unlink(vault_path)
        except OSError:
            pass
        raise

    session.clear()
    session["authenticated"] = True
    session["fernet_key"] = _encrypt_session_value(fernet_key)
    session["salt"] = _encrypt_session_value(salt)
    session["last_active"] = time.time()

    return jsonify({"success": True}), 201

@auth_bp.route("/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"success": True})