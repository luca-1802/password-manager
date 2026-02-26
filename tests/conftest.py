import os
import time
import pytest
from cachelib import FileSystemCache
from backend import create_app
from backend.vault import derive_key, save_passwords_with_key, SALT_SIZE
from backend.routes.auth_routes import _encrypt_session_value

TEST_MASTER_PASSWORD = "SecurePass123!"
TEST_SALT = os.urandom(SALT_SIZE)
TEST_KEY = derive_key(TEST_MASTER_PASSWORD, TEST_SALT)

@pytest.fixture
def app(tmp_path, monkeypatch):
    monkeypatch.setenv("VAULT_DIR", str(tmp_path))
    monkeypatch.delenv("BACKUP_DIR", raising=False)
    monkeypatch.delenv("BACKUP_MAX_COUNT", raising=False)
    monkeypatch.delenv("BACKUP_RETENTION_DAYS", raising=False)

    app = create_app()
    app.config.update(
        TESTING=True,
        VAULT_FILE=str(tmp_path / "vault.enc"),
        TOTP_FILE=str(tmp_path / ".totp.enc"),
        LOCKOUT_FILE=str(tmp_path / ".vault.lock"),
        TOTP_LOCKOUT_FILE=str(tmp_path / ".totp_lockout.json"),
        TOTP_USED_CODES_FILE=str(tmp_path / ".totp_used_codes.json"),
        SESSION_CACHELIB=FileSystemCache(str(tmp_path / ".flask_sessions")),
    )

    return app

@pytest.fixture
def client(app):
    return app.test_client()

@pytest.fixture
def vault_path(app):
    return app.config["VAULT_FILE"]

@pytest.fixture
def seeded_vault(app):
    vault_path = app.config["VAULT_FILE"]
    salt = os.urandom(SALT_SIZE)
    key = derive_key(TEST_MASTER_PASSWORD, salt)
    save_passwords_with_key(key, salt, {}, vault_path)
    return key, salt, vault_path

@pytest.fixture
def auth_client(app, seeded_vault):
    key, salt, _ = seeded_vault
    client = app.test_client()
    with client.session_transaction() as sess:
        sess["authenticated"] = True
        sess["vault_key"] = _encrypt_session_value(key)
        sess["salt"] = _encrypt_session_value(salt)
        sess["last_active"] = time.time()
        sess["csrf_token"] = "test-csrf-token"
    return client

def csrf_headers():
    return {"X-CSRF-Token": "test-csrf-token", "Content-Type": "application/json"}