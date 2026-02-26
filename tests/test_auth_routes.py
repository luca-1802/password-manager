import os
import json
import time
import pytest
from backend.vault import derive_key, save_passwords_with_key, SALT_SIZE
from tests.conftest import TEST_MASTER_PASSWORD, csrf_headers

class TestAuthStatus:
    def test_unauthenticated_status(self, client):
        resp = client.get("/api/auth/status")
        data = resp.get_json()
        assert data["authenticated"] is False
        assert data["is_new_vault"] is True

    def test_authenticated_status(self, auth_client):
        resp = auth_client.get("/api/auth/status")
        data = resp.get_json()
        assert data["authenticated"] is True

    def test_vault_exists_reflected(self, client, seeded_vault):
        resp = client.get("/api/auth/status")
        data = resp.get_json()
        assert data["is_new_vault"] is False

class TestCreateVault:
    def test_create_vault_success(self, client, vault_path):
        resp = client.post("/api/auth/create", json={
            "master_password": TEST_MASTER_PASSWORD,
            "confirm": TEST_MASTER_PASSWORD,
        })
        assert resp.status_code == 201
        data = resp.get_json()
        assert data["success"] is True
        assert os.path.exists(vault_path)

    def test_create_vault_password_mismatch(self, client):
        resp = client.post("/api/auth/create", json={
            "master_password": "SecurePass123!",
            "confirm": "DifferentPass1!",
        })
        assert resp.status_code == 400
        assert "do not match" in resp.get_json()["error"]

    def test_create_vault_weak_password(self, client):
        resp = client.post("/api/auth/create", json={
            "master_password": "short",
            "confirm": "short",
        })
        assert resp.status_code == 400

    def test_create_vault_already_exists(self, client, seeded_vault):
        resp = client.post("/api/auth/create", json={
            "master_password": TEST_MASTER_PASSWORD,
            "confirm": TEST_MASTER_PASSWORD,
        })
        assert resp.status_code == 400
        assert "already exists" in resp.get_json()["error"]

class TestLogin:
    def test_login_success(self, client, seeded_vault):
        resp = client.post("/api/auth/login", json={
            "master_password": TEST_MASTER_PASSWORD,
        })
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["success"] is True

    def test_login_wrong_password(self, client, seeded_vault):
        resp = client.post("/api/auth/login", json={
            "master_password": "WrongPassword123",
        })
        assert resp.status_code == 401
        assert "Invalid password" in resp.get_json()["error"]

    def test_login_no_vault(self, client):
        resp = client.post("/api/auth/login", json={
            "master_password": "AnyPassword123",
        })
        assert resp.status_code == 400
        assert "not initialized" in resp.get_json()["error"]

    def test_login_sets_session(self, client, seeded_vault):
        client.post("/api/auth/login", json={
            "master_password": TEST_MASTER_PASSWORD,
        })
        resp = client.get("/api/auth/status")
        assert resp.get_json()["authenticated"] is True

class TestLogout:
    def test_logout_clears_session(self, auth_client):
        resp = auth_client.post("/api/auth/logout", headers=csrf_headers())
        assert resp.status_code == 200
        status = auth_client.get("/api/auth/status")
        assert status.get_json()["authenticated"] is False

class TestChangePassword:
    def test_change_password_success(self, auth_client, seeded_vault):
        resp = auth_client.post("/api/auth/change-password", headers=csrf_headers(), json={
            "current_password": TEST_MASTER_PASSWORD,
            "new_password": "NewSecurePass1!",
            "confirm": "NewSecurePass1!",
        })
        assert resp.status_code == 200
        assert resp.get_json()["success"] is True

    def test_change_password_wrong_current(self, auth_client, seeded_vault):
        resp = auth_client.post("/api/auth/change-password", headers=csrf_headers(), json={
            "current_password": "WrongCurrent123",
            "new_password": "NewSecurePass1!",
            "confirm": "NewSecurePass1!",
        })
        assert resp.status_code == 401

    def test_change_password_mismatch(self, auth_client, seeded_vault):
        resp = auth_client.post("/api/auth/change-password", headers=csrf_headers(), json={
            "current_password": TEST_MASTER_PASSWORD,
            "new_password": "NewSecurePass1!",
            "confirm": "DifferentPass1!",
        })
        assert resp.status_code == 400
        assert "do not match" in resp.get_json()["error"]

    def test_change_password_same_as_current(self, auth_client, seeded_vault):
        resp = auth_client.post("/api/auth/change-password", headers=csrf_headers(), json={
            "current_password": TEST_MASTER_PASSWORD,
            "new_password": TEST_MASTER_PASSWORD,
            "confirm": TEST_MASTER_PASSWORD,
        })
        assert resp.status_code == 400
        assert "different" in resp.get_json()["error"]

    def test_change_password_unauthenticated(self, client, seeded_vault):
        resp = client.post("/api/auth/change-password",
            headers={"Content-Type": "application/json"},
            json={
                "current_password": TEST_MASTER_PASSWORD,
                "new_password": "NewSecurePass1!",
                "confirm": "NewSecurePass1!",
            },
        )
        assert resp.status_code in (401, 403)

class TestSessionTimeout:
    def test_expired_session_returns_401(self, app, seeded_vault):
        from backend.routes.auth_routes import _encrypt_session_value
        key, salt, _ = seeded_vault
        client = app.test_client()
        with client.session_transaction() as sess:
            sess["authenticated"] = True
            sess["vault_key"] = _encrypt_session_value(key)
            sess["salt"] = _encrypt_session_value(salt)
            sess["last_active"] = time.time() - 600
            sess["csrf_token"] = "test-csrf-token"
        resp = client.get("/api/auth/status")
        assert resp.status_code == 401
        assert "timed out" in resp.get_json()["error"]

class TestCsrfProtection:
    def test_post_without_csrf_rejected(self, auth_client):
        resp = auth_client.post("/api/auth/logout",
            headers={"Content-Type": "application/json"},
        )
        assert resp.status_code == 403

    def test_post_with_correct_csrf_succeeds(self, auth_client):
        resp = auth_client.post("/api/auth/logout", headers=csrf_headers())
        assert resp.status_code == 200