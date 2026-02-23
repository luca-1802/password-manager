import os
import json
import logging
import string
import secrets
import time
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from argon2.low_level import hash_secret_raw, Type
from filelock import FileLock

logger = logging.getLogger(__name__)

class VaultDecryptionError(Exception):
    pass

SALT_SIZE = 16
NONCE_SIZE = 12
VAULT_MAGIC = b"PV02"
EXPORT_MAGIC = b"PX01"
ARGON2_TIME_COST = 3
ARGON2_MEMORY_COST = 65536
ARGON2_PARALLELISM = 4

def derive_key(master_pwd, salt):
    return hash_secret_raw(
        secret=master_pwd.encode(),
        salt=salt,
        time_cost=ARGON2_TIME_COST,
        memory_cost=ARGON2_MEMORY_COST,
        parallelism=ARGON2_PARALLELISM,
        hash_len=32,
        type=Type.ID,
    )

def _aes_gcm_encrypt(key_raw, plaintext, aad):
    nonce = os.urandom(NONCE_SIZE)
    ct = AESGCM(key_raw).encrypt(nonce, plaintext, aad)
    return nonce + ct

def _aes_gcm_decrypt(key_raw, nonce_and_ct, aad):
    nonce = nonce_and_ct[:NONCE_SIZE]
    ct = nonce_and_ct[NONCE_SIZE:]
    return AESGCM(key_raw).decrypt(nonce, ct, aad)

def load_passwords(master_pwd, vault_path):
    if not os.path.exists(vault_path):
        salt = os.urandom(SALT_SIZE)
        return salt, {}, derive_key(master_pwd, salt)
    try:
        with open(vault_path, "rb") as f:
            raw = f.read()
    except OSError as e:
        logger.error("Could not read vault file: %s", e)
        return None, None, None

    if len(raw) < SALT_SIZE + 1:
        logger.error("Vault file is corrupted (too short)")
        return None, None, None

    if raw[:4] != VAULT_MAGIC:
        logger.error("Vault file has unrecognized format")
        return None, None, None

    salt = raw[4:4 + SALT_SIZE]
    nonce_and_ct = raw[4 + SALT_SIZE:]
    if not nonce_and_ct:
        logger.error("Vault file is corrupted (no encrypted data)")
        return None, None, None
    key_raw = derive_key(master_pwd, salt)
    try:
        decrypted = _aes_gcm_decrypt(key_raw, nonce_and_ct, VAULT_MAGIC)
        data = json.loads(decrypted.decode())
        if not isinstance(data, dict):
            logger.error("Vault data is not a valid password dictionary")
            return None, None, None
        return salt, data, key_raw
    except Exception:
        return None, None, None

def load_passwords_with_key(key_raw, vault_path):
    if not os.path.exists(vault_path):
        return {}
    try:
        with open(vault_path, "rb") as f:
            raw = f.read()
    except OSError as e:
        logger.error("Could not read vault file: %s", e)
        return {}

    nonce_and_ct = raw[4 + SALT_SIZE:]
    try:
        decrypted = _aes_gcm_decrypt(key_raw, nonce_and_ct, VAULT_MAGIC)
        data = json.loads(decrypted.decode())
        if not isinstance(data, dict):
            logger.error("Vault data is not a valid password dictionary")
            raise VaultDecryptionError("Vault data is not a valid password dictionary")
        return data
    except VaultDecryptionError:
        raise
    except Exception:
        logger.error("Failed to decrypt vault (invalid key or corrupted data)")
        raise VaultDecryptionError("Failed to decrypt vault (invalid key or corrupted data)")

def save_passwords_with_key(key_raw, salt, passwords_dict, vault_path):
    plaintext = json.dumps(passwords_dict).encode()
    nonce_and_ct = _aes_gcm_encrypt(key_raw, plaintext, VAULT_MAGIC)
    tmp_path = vault_path + ".tmp"
    try:
        fd = os.open(tmp_path, os.O_CREAT | os.O_WRONLY | os.O_TRUNC, 0o600)
        with os.fdopen(fd, "wb") as f:
            f.write(VAULT_MAGIC)
            f.write(salt)
            f.write(nonce_and_ct)
        os.replace(tmp_path, vault_path)
    except OSError as e:
        logger.error("Could not write vault file: %s", e)
        raise

def check_lockout(lockout_path):
    lock = FileLock(lockout_path + ".lock")
    with lock:
        if not os.path.exists(lockout_path):
            return False, 0
        try:
            with open(lockout_path, "r") as f:
                data = json.load(f)
        except (OSError, json.JSONDecodeError):
            logger.warning("Corrupted lockout file, removing it")
            try:
                os.remove(lockout_path)
            except OSError:
                pass
            return False, 0
        locked_until = data.get("locked_until", 0)
        if time.time() < locked_until:
            return True, int(locked_until - time.time())

        data["cycle_attempts"] = 0
        data["locked_until"] = 0
        try:
            with open(lockout_path, "w") as f:
                json.dump(data, f)
        except OSError as e:
            logger.error("Could not write lockout file: %s", e)
        return False, 0

def record_failed_attempt(lockout_path, max_attempts=3):
    lock = FileLock(lockout_path + ".lock")
    with lock:
        total_attempts = 0
        cycle_attempts = 0
        if os.path.exists(lockout_path):
            try:
                with open(lockout_path, "r") as f:
                    data = json.load(f)
                    total_attempts = data.get("total_attempts", 0)
                    cycle_attempts = data.get("cycle_attempts", 0)
            except (OSError, json.JSONDecodeError):
                total_attempts = 0
                cycle_attempts = 0
        total_attempts += 1
        cycle_attempts += 1
        lockout_data = {
            "total_attempts": total_attempts,
            "cycle_attempts": cycle_attempts,
            "locked_until": 0,
        }
        lockout_seconds = 0
        if cycle_attempts >= max_attempts:
            lockout_seconds = min(60 * (2 ** (total_attempts // max_attempts)), 86400)
            lockout_data["locked_until"] = time.time() + lockout_seconds
        try:
            with open(lockout_path, "w") as f:
                json.dump(lockout_data, f)
        except OSError as e:
            logger.error("Could not write lockout file: %s", e)
        return cycle_attempts >= max_attempts, lockout_seconds

def clear_lockout(lockout_path):
    lock = FileLock(lockout_path + ".lock")
    with lock:
        try:
            if os.path.exists(lockout_path):
                os.remove(lockout_path)
        except OSError:
            pass

def normalize_entries(entries):
    if isinstance(entries, dict):
        return [entries]
    return entries

def has_totp(totp_path):
    return os.path.exists(totp_path)

def generate_backup_codes(count=10, length=8):
    alphabet = string.ascii_lowercase + string.digits
    return [
        "".join(secrets.choice(alphabet) for _ in range(length))
        for _ in range(count)
    ]

def save_totp_data(key_raw, salt, totp_data, totp_path):
    plaintext = json.dumps(totp_data).encode()
    nonce_and_ct = _aes_gcm_encrypt(key_raw, plaintext, VAULT_MAGIC)
    tmp_path = totp_path + ".tmp"
    try:
        fd = os.open(tmp_path, os.O_CREAT | os.O_WRONLY | os.O_TRUNC, 0o600)
        with os.fdopen(fd, "wb") as f:
            f.write(VAULT_MAGIC)
            f.write(salt)
            f.write(nonce_and_ct)
        os.replace(tmp_path, totp_path)
    except OSError as e:
        logger.error("Could not write TOTP file: %s", e)
        raise

def load_totp_data(key_raw, totp_path):
    if not os.path.exists(totp_path):
        return None
    try:
        with open(totp_path, "rb") as f:
            raw = f.read()
    except OSError as e:
        logger.error("Could not read TOTP file: %s", e)
        return None

    nonce_and_ct = raw[4 + SALT_SIZE:]
    try:
        decrypted = _aes_gcm_decrypt(key_raw, nonce_and_ct, VAULT_MAGIC).decode()
    except Exception:
        logger.error("Failed to decrypt TOTP data (invalid key or corrupted)")
        return None

    try:
        data = json.loads(decrypted)
        if isinstance(data, dict) and "secret" in data:
            return data
    except (json.JSONDecodeError, ValueError):
        pass

    return {"secret": decrypted, "backup_codes": []}

def delete_totp_secret(totp_path):
    try:
        if os.path.exists(totp_path):
            os.remove(totp_path)
    except OSError as e:
        logger.error("Could not delete TOTP file: %s", e)
        raise

def encrypt_export(password, plaintext_bytes):
    salt = os.urandom(SALT_SIZE)
    key_raw = derive_key(password, salt)
    nonce_and_ct = _aes_gcm_encrypt(key_raw, plaintext_bytes, EXPORT_MAGIC)
    return EXPORT_MAGIC + salt + nonce_and_ct

def decrypt_export(password, file_data):
    if len(file_data) < 4 + SALT_SIZE + NONCE_SIZE + 16:
        raise VaultDecryptionError("File is too short or corrupted")
    if file_data[:4] != EXPORT_MAGIC:
        raise VaultDecryptionError("Invalid encrypted export file")
    salt = file_data[4:4 + SALT_SIZE]
    nonce_and_ct = file_data[4 + SALT_SIZE:]
    key_raw = derive_key(password, salt)
    try:
        return _aes_gcm_decrypt(key_raw, nonce_and_ct, EXPORT_MAGIC)
    except Exception:
        raise VaultDecryptionError("Wrong password or corrupted file")

def generate_password(length=19):
    if length < 4:
        length = 4
    lower = string.ascii_lowercase
    upper = string.ascii_uppercase
    digits = string.digits
    special = "!@#$%&*?=_+"

    num_dashes = (length - 1) // 5
    raw_length = length - num_dashes
    if raw_length < 4:
        raw_length = 4

    password = [
        secrets.choice(lower),
        secrets.choice(upper),
        secrets.choice(digits),
        secrets.choice(special),
    ]
    alphabet = lower + upper + digits + special
    password += [secrets.choice(alphabet) for _ in range(raw_length - 4)]
    secrets.SystemRandom().shuffle(password)

    raw = "".join(password)
    chunks = [raw[i:i + 4] for i in range(0, len(raw), 4)]
    return "-".join(chunks)