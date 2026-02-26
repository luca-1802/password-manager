import time
import pytest
from unittest.mock import patch
from backend import token_store

@pytest.fixture(autouse=True)
def clean_tokens():
    with token_store._lock:
        token_store._tokens.clear()
    yield
    with token_store._lock:
        token_store._tokens.clear()

class TestCreateToken:
    def test_returns_hex_string(self):
        token = token_store.create_token(b"key", b"salt")
        assert isinstance(token, str)
        assert len(token) == 64

    def test_stores_vault_key_and_salt(self):
        key, salt = b"vault-key", b"vault-salt"
        token = token_store.create_token(key, salt)
        material = token_store.validate_token(token)
        assert material["vault_key"] == key
        assert material["salt"] == salt

    def test_pending_2fa_flag(self):
        token = token_store.create_token(b"k", b"s", pending_2fa=True)
        assert token_store.validate_token(token) is None
        material = token_store.validate_pending_token(token)
        assert material is not None
        assert material["pending_2fa"] is True

    def test_tokens_are_unique(self):
        tokens = {token_store.create_token(b"k", b"s") for _ in range(50)}
        assert len(tokens) == 50

class TestValidateToken:
    def test_valid_token(self):
        token = token_store.create_token(b"key", b"salt")
        material = token_store.validate_token(token)
        assert material is not None

    def test_invalid_token_returns_none(self):
        assert token_store.validate_token("nonexistent-token") is None

    def test_pending_token_rejected(self):
        token = token_store.create_token(b"k", b"s", pending_2fa=True)
        assert token_store.validate_token(token) is None

    def test_updates_last_active(self):
        token = token_store.create_token(b"k", b"s")
        before = token_store._tokens[token]["last_active"]
        time.sleep(0.05)
        token_store.validate_token(token)
        after = token_store._tokens[token]["last_active"]
        assert after >= before

    def test_expired_token_cleaned_up(self):
        token = token_store.create_token(b"k", b"s")
        with token_store._lock:
            token_store._tokens[token]["last_active"] = time.time() - 400
        assert token_store.validate_token(token) is None

class TestValidatePendingToken:
    def test_valid_pending(self):
        token = token_store.create_token(b"k", b"s", pending_2fa=True)
        material = token_store.validate_pending_token(token)
        assert material is not None
        assert material["pending_2fa"] is True

    def test_non_pending_rejected(self):
        token = token_store.create_token(b"k", b"s", pending_2fa=False)
        assert token_store.validate_pending_token(token) is None

    def test_invalid_token_returns_none(self):
        assert token_store.validate_pending_token("bad") is None

class TestUpgradeToken:
    def test_replaces_old_token(self):
        old = token_store.create_token(b"k", b"s", pending_2fa=True)
        new_key, new_salt = b"new-key", b"new-salt"
        new = token_store.upgrade_token(old, new_key, new_salt)

        assert token_store.validate_token(old) is None
        material = token_store.validate_token(new)
        assert material is not None
        assert material["vault_key"] == new_key
        assert material["salt"] == new_salt
        assert material["pending_2fa"] is False

    def test_upgrade_nonexistent_token_still_creates_new(self):
        new = token_store.upgrade_token("fake-old-token", b"k", b"s")
        material = token_store.validate_token(new)
        assert material is not None

class TestRevokeToken:
    def test_revoke_existing(self):
        token = token_store.create_token(b"k", b"s")
        assert token_store.revoke_token(token) is True
        assert token_store.validate_token(token) is None

    def test_revoke_nonexistent(self):
        assert token_store.revoke_token("fake") is False

    def test_double_revoke(self):
        token = token_store.create_token(b"k", b"s")
        assert token_store.revoke_token(token) is True
        assert token_store.revoke_token(token) is False