import os
import stat
import logging

from cachelib import SimpleCache
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes

logger = logging.getLogger(__name__)

_BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_DATA_DIR = os.environ.get("VAULT_DIR", _BASE_DIR)
_SECRET_KEY_FILE = os.path.join(_DATA_DIR, ".flask_secret_key")

def _get_or_create_secret_key():
    try:
        with open(_SECRET_KEY_FILE, "rb") as f:
            key = f.read()
            if len(key) == 32:
                return key
    except FileNotFoundError:
        pass

    key = os.urandom(32)
    os.makedirs(os.path.dirname(_SECRET_KEY_FILE) or ".", exist_ok=True)

    try:
        fd = os.open(
            _SECRET_KEY_FILE,
            os.O_CREAT | os.O_EXCL | os.O_WRONLY,
            stat.S_IRUSR | stat.S_IWUSR,
        )
        try:
            os.write(fd, key)
        finally:
            os.close(fd)
        return key
    except FileExistsError:
        with open(_SECRET_KEY_FILE, "rb") as f:
            return f.read()

def get_session_encryption_key():
    secret = _get_or_create_secret_key()
    return HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=None,
        info=b"session-encryption-key",
    ).derive(secret)

class Config:
    SECRET_KEY = _get_or_create_secret_key()
    SESSION_TYPE = "cachelib"
    SESSION_CACHELIB = SimpleCache()
    SESSION_PERMANENT = False
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Strict"
    SESSION_COOKIE_SECURE = os.environ.get("SECURE_COOKIES", "").lower() == "true"
    PERMANENT_SESSION_LIFETIME = 300
    VAULT_FILE = os.path.join(_DATA_DIR, "vault.enc")
    TOTP_FILE = os.path.join(_DATA_DIR, ".totp.enc")
    LOCKOUT_FILE = os.path.join(_DATA_DIR, ".vault.lock")
    TOTP_LOCKOUT_FILE = os.path.join(_DATA_DIR, ".totp_lockout.json")
    TOTP_USED_CODES_FILE = os.path.join(_DATA_DIR, ".totp_used_codes.json")
    MAX_LOGIN_ATTEMPTS = 3
    MAX_2FA_ATTEMPTS = 5
    MIN_MASTER_PWD_LENGTH = 12
    INACTIVITY_TIMEOUT = 300
    TRASH_RETENTION_DAYS = int(os.environ.get("TRASH_RETENTION_DAYS", "30"))