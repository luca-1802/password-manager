import re
import logging
from functools import wraps
from flask import Blueprint, request, jsonify, session, current_app
from backend.vault import load_passwords_with_key, save_passwords_with_key, generate_password, normalize_entries
from backend.routes.auth_routes import _decrypt_session_value

logger = logging.getLogger(__name__)

vault_bp = Blueprint("vault", __name__)

MAX_WEBSITE_LENGTH = 253
MAX_USERNAME_LENGTH = 256
MAX_PASSWORD_LENGTH = 1024
MAX_TOTAL_ENTRIES = 10000
MAX_ENTRIES_PER_SITE = 100

def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get("authenticated"):
            return jsonify({"error": "Not authenticated"}), 401
        return f(*args, **kwargs)
    return decorated

def validate_website(website):
    if not website or len(website) > MAX_WEBSITE_LENGTH:
        return False
    if not re.match(r'^[\w\s.\-]+$', website):
        return False
    return True

def get_vault_data():
    try:
        fernet_key = _decrypt_session_value(session["fernet_key"])
        vault_path = current_app.config["VAULT_FILE"]
        passwords = load_passwords_with_key(fernet_key, vault_path)
        return fernet_key, vault_path, passwords
    except Exception as e:
        logger.error("Failed to load vault data: %s", e)
        return None, None, None

def save_vault(fernet_key, vault_path, passwords):
    salt = _decrypt_session_value(session["salt"])
    save_passwords_with_key(fernet_key, salt, passwords, vault_path)

@vault_bp.route("/", methods=["GET"])
@require_auth
def get_all():
    _, _, passwords = get_vault_data()
    if passwords is None:
        return jsonify({"error": "Failed to decrypt vault. Please log in again."}), 500
    return jsonify({"passwords": passwords})

@vault_bp.route("/", methods=["POST"])
@require_auth
def add_entry():
    data = request.get_json()
    if not data or not data.get("website") or not data.get("username"):
        return jsonify({"error": "Website and username are required"}), 400
    if not isinstance(data.get("website"), str) or not isinstance(data.get("username"), str):
        return jsonify({"error": "Website and username must be strings"}), 400
    if data.get("password") is not None and not isinstance(data["password"], str):
        return jsonify({"error": "Password must be a string"}), 400

    website = data["website"].strip().lower()
    username = data["username"].strip()
    password = data.get("password") or generate_password()

    if not validate_website(website):
        return jsonify({"error": "Invalid website name"}), 400
    if not username or len(username) > MAX_USERNAME_LENGTH:
        return jsonify({"error": f"Username must be 1-{MAX_USERNAME_LENGTH} characters"}), 400
    if len(password) > MAX_PASSWORD_LENGTH:
        return jsonify({"error": f"Password must be at most {MAX_PASSWORD_LENGTH} characters"}), 400

    fernet_key, vault_path, passwords = get_vault_data()
    if fernet_key is None:
        return jsonify({"error": "Failed to decrypt vault. Please log in again."}), 500

    total_entries = sum(len(v) if isinstance(v, list) else 1 for v in passwords.values())
    if total_entries >= MAX_TOTAL_ENTRIES:
        return jsonify({"error": "Vault entry limit reached"}), 400

    if website not in passwords:
        passwords[website] = []

    passwords[website] = normalize_entries(passwords[website])
    if len(passwords[website]) >= MAX_ENTRIES_PER_SITE:
        return jsonify({"error": "Too many entries for this website"}), 400
    passwords[website].append({"username": username, "password": password})
    save_vault(fernet_key, vault_path, passwords)

    return jsonify({"success": True, "password": password}), 201

@vault_bp.route("/<website>/<int:index>", methods=["DELETE"])
@require_auth
def delete_entry(website, index):
    fernet_key, vault_path, passwords = get_vault_data()
    if fernet_key is None:
        return jsonify({"error": "Failed to decrypt vault. Please log in again."}), 500
    website = website.lower()
    if not validate_website(website):
        return jsonify({"error": "Invalid website name"}), 400

    if website not in passwords:
        return jsonify({"error": "Website not found"}), 404

    entries = normalize_entries(passwords[website])

    if index < 0 or index >= len(entries):
        return jsonify({"error": "Invalid index"}), 400

    entries.pop(index)
    if not entries:
        del passwords[website]
    else:
        passwords[website] = entries

    save_vault(fernet_key, vault_path, passwords)
    return jsonify({"success": True})

@vault_bp.route("/<website>/<int:index>", methods=["PUT"])
@require_auth
def edit_entry(website, index):
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    fernet_key, vault_path, passwords = get_vault_data()
    if fernet_key is None:
        return jsonify({"error": "Failed to decrypt vault. Please log in again."}), 500
    website = website.lower()
    if not validate_website(website):
        return jsonify({"error": "Invalid website name"}), 400

    if website not in passwords:
        return jsonify({"error": "Website not found"}), 404

    entries = normalize_entries(passwords[website])

    if index < 0 or index >= len(entries):
        return jsonify({"error": "Invalid index"}), 400

    if "username" in data:
        if not isinstance(data["username"], str):
            return jsonify({"error": "Username must be a string"}), 400
        username = data["username"].strip()
        if not username or len(username) > MAX_USERNAME_LENGTH:
            return jsonify({"error": f"Username must be 1-{MAX_USERNAME_LENGTH} characters"}), 400
        entries[index]["username"] = username
    if "password" in data:
        if not isinstance(data["password"], str):
            return jsonify({"error": "Password must be a string"}), 400
        password = data["password"]
        if not password:
            return jsonify({"error": "Password cannot be empty"}), 400
        if len(password) > MAX_PASSWORD_LENGTH:
            return jsonify({"error": f"Password must be at most {MAX_PASSWORD_LENGTH} characters"}), 400
        entries[index]["password"] = password

    passwords[website] = entries
    save_vault(fernet_key, vault_path, passwords)
    return jsonify({"success": True})