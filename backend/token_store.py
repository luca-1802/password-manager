import time
import secrets
import threading

_TOKEN_TIMEOUT = 300

_lock = threading.Lock()
_tokens = {}

def _cleanup_expired():
    now = time.time()
    expired = [t for t, v in _tokens.items() if now - v["last_active"] > _TOKEN_TIMEOUT]
    for t in expired:
        del _tokens[t]

def create_token(vault_key, salt, pending_2fa=False):
    token = secrets.token_hex(32)
    with _lock:
        _tokens[token] = {
            "vault_key": vault_key,
            "salt": salt,
            "last_active": time.time(),
            "pending_2fa": pending_2fa,
        }
    return token

def validate_token(token):
    with _lock:
        _cleanup_expired()
        material = _tokens.get(token)
        if material is None:
            return None
        if material["pending_2fa"]:
            return None
        material["last_active"] = time.time()
        return material

def validate_pending_token(token):
    with _lock:
        _cleanup_expired()
        material = _tokens.get(token)
        if material is None:
            return None
        if not material["pending_2fa"]:
            return None
        material["last_active"] = time.time()
        return material

def upgrade_token(old_token, vault_key, salt):
    new_token = secrets.token_hex(32)
    with _lock:
        _tokens.pop(old_token, None)
        _tokens[new_token] = {
            "vault_key": vault_key,
            "salt": salt,
            "last_active": time.time(),
            "pending_2fa": False,
        }
    return new_token

def revoke_token(token):
    with _lock:
        return _tokens.pop(token, None) is not None