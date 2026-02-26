import string
import pytest
from tests.conftest import csrf_headers

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

    def test_no_special_characters(self, auth_client):
        resp = auth_client.get("/api/generate?special=false")
        pwd = resp.get_json()["password"]
        assert all(c not in "!@#$%&*?=_+" for c in pwd)

    def test_unauthenticated_rejected(self, client):
        resp = client.get("/api/generate")
        assert resp.status_code == 401

class TestBackupRoutes:
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