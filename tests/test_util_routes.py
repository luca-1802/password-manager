import string
import pytest
from tests.conftest import csrf_headers

class TestHealthCheck:
    def test_health_returns_ok(self, client):
        resp = client.get("/api/health")
        assert resp.status_code == 200
        assert resp.get_json()["status"] == "ok"

    def test_health_no_auth_required(self, client):
        resp = client.get("/api/health")
        assert resp.status_code == 200

class TestGeneratePassword:
    def test_default_generation(self, auth_client):
        resp = auth_client.get("/api/generate")
        assert resp.status_code == 200
        pwd = resp.get_json()["password"]
        assert len(pwd) == 16

    def test_custom_length(self, auth_client):
        resp = auth_client.get("/api/generate?length=24")
        assert resp.status_code == 200
        assert len(resp.get_json()["password"]) == 24

    def test_length_clamped_to_min(self, auth_client):
        resp = auth_client.get("/api/generate?length=1")
        assert resp.status_code == 200
        assert len(resp.get_json()["password"]) >= 4

    def test_length_clamped_to_max(self, auth_client):
        resp = auth_client.get("/api/generate?length=999")
        assert resp.status_code == 200
        assert len(resp.get_json()["password"]) <= 128

    def test_no_special_characters(self, auth_client):
        resp = auth_client.get("/api/generate?special=false")
        pwd = resp.get_json()["password"]
        assert all(c not in "!@#$%&*?=_+" for c in pwd)

    def test_unauthenticated_rejected(self, client):
        resp = client.get("/api/generate")
        assert resp.status_code == 401

class TestBackupRoutes:
    def test_list_backups_empty(self, auth_client):
        resp = auth_client.get("/api/backups/")
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["vault_backups"] == []
        assert data["totp_backups"] == []

    def test_list_backups_unauthenticated(self, client):
        resp = client.get("/api/backups/")
        assert resp.status_code == 401

    def test_restore_missing_filename(self, auth_client):
        resp = auth_client.post("/api/backups/restore", headers=csrf_headers(), json={})
        assert resp.status_code == 400

    def test_restore_invalid_target(self, auth_client):
        resp = auth_client.post("/api/backups/restore", headers=csrf_headers(), json={
            "filename": "test.bak",
            "target": "invalid",
        })
        assert resp.status_code == 400

    def test_restore_path_traversal_rejected(self, auth_client):
        resp = auth_client.post("/api/backups/restore", headers=csrf_headers(), json={
            "filename": "../../../etc/passwd",
        })
        assert resp.status_code == 400

    def test_restore_nonexistent_backup(self, auth_client):
        resp = auth_client.post("/api/backups/restore", headers=csrf_headers(), json={
            "filename": "vault.enc.2099-01-01T00-00-00-000000Z.bak",
        })
        assert resp.status_code == 404