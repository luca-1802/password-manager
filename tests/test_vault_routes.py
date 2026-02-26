import os
import json
import pytest
from backend.vault import load_passwords_with_key, save_passwords_with_key, SALT_SIZE, derive_key
from tests.conftest import csrf_headers

class TestGetAll:
    def test_get_empty_vault(self, auth_client):
        resp = auth_client.get("/api/passwords/")
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["passwords"] == {}
        assert data["folders"] == []

    def test_get_all_returns_trash_count(self, auth_client):
        # Empty vault should have trash_count 0
        resp = auth_client.get("/api/passwords/")
        data = resp.get_json()
        assert "trash_count" in data
        assert data["trash_count"] == 0

        # After deleting an entry, trash_count should be 1
        auth_client.post("/api/passwords/", headers=csrf_headers(), json={
            "website": "countme.com",
            "username": "user",
            "password": "Count123!",
        })
        auth_client.delete("/api/passwords/0/countme.com", headers=csrf_headers())
        resp = auth_client.get("/api/passwords/")
        data = resp.get_json()
        assert data["trash_count"] == 1

    def test_unauthenticated_rejected(self, client):
        resp = client.get("/api/passwords/")
        assert resp.status_code == 401

class TestAddEntry:
    def test_add_simple_entry(self, auth_client):
        resp = auth_client.post("/api/passwords/", headers=csrf_headers(), json={
            "website": "example.com",
            "username": "user@test.com",
            "password": "SecretPass123!",
        })
        assert resp.status_code == 201
        data = resp.get_json()
        assert data["success"] is True
        assert data["password"] == "SecretPass123!"

    def test_auto_generated_password(self, auth_client):
        resp = auth_client.post("/api/passwords/", headers=csrf_headers(), json={
            "website": "example.com",
            "username": "user",
        })
        assert resp.status_code == 201
        assert len(resp.get_json()["password"]) >= 16

    def test_add_with_folder(self, auth_client):
        resp = auth_client.post("/api/passwords/", headers=csrf_headers(), json={
            "website": "work.example.com",
            "username": "admin",
            "password": "WorkPass123!",
            "folder": "Work",
        })
        assert resp.status_code == 201
        vault_resp = auth_client.get("/api/passwords/")
        assert "Work" in vault_resp.get_json()["folders"]

    def test_invalid_website_rejected(self, auth_client):
        resp = auth_client.post("/api/passwords/", headers=csrf_headers(), json={
            "website": "<script>alert(1)</script>",
            "password": "pass",
        })
        assert resp.status_code == 400

    def test_reserved_website_name_rejected(self, auth_client):
        resp = auth_client.post("/api/passwords/", headers=csrf_headers(), json={
            "website": "_folders_meta",
            "password": "pass",
        })
        assert resp.status_code == 400

    def test_duplicate_entry_rejected(self, auth_client):
        payload = {
            "website": "example.com",
            "username": "user",
            "password": "SamePass123!",
        }
        auth_client.post("/api/passwords/", headers=csrf_headers(), json=payload)
        resp = auth_client.post("/api/passwords/", headers=csrf_headers(), json=payload)
        assert resp.status_code == 409
        assert "already exists" in resp.get_json()["error"]

    def test_website_normalized_to_lowercase(self, auth_client):
        auth_client.post("/api/passwords/", headers=csrf_headers(), json={
            "website": "Example.COM",
            "username": "user",
            "password": "Pass123!",
        })
        resp = auth_client.get("/api/passwords/")
        passwords = resp.get_json()["passwords"]
        assert "example.com" in passwords

    def test_unauthenticated_rejected(self, client):
        resp = client.post("/api/passwords/",
            headers={"Content-Type": "application/json"},
            json={"website": "test.com", "password": "pass"},
        )
        assert resp.status_code in (401, 403)

class TestDeleteEntry:
    def test_delete_entry(self, auth_client):
        auth_client.post("/api/passwords/", headers=csrf_headers(), json={
            "website": "delete-me.com",
            "username": "user",
            "password": "Pass123!",
        })
        resp = auth_client.delete("/api/passwords/0/delete-me.com", headers=csrf_headers())
        assert resp.status_code == 200

        vault = auth_client.get("/api/passwords/").get_json()
        assert "delete-me.com" not in vault["passwords"]

    def test_delete_moves_to_trash(self, auth_client):
        auth_client.post("/api/passwords/", headers=csrf_headers(), json={
            "website": "trash-target.com",
            "username": "trashuser",
            "password": "TrashPass123!",
        })
        auth_client.delete("/api/passwords/0/trash-target.com", headers=csrf_headers())

        # Verify entry is gone from passwords
        vault = auth_client.get("/api/passwords/").get_json()
        assert "trash-target.com" not in vault["passwords"]

        # Verify entry appears in trash
        trash_resp = auth_client.get("/api/trash/")
        trash_data = trash_resp.get_json()
        assert trash_data["count"] == 1
        item = trash_data["items"][0]
        assert item["entry_type"] == "password"
        assert item["original_key"] == "trash-target.com"
        assert item["entry"]["username"] == "trashuser"
        assert item["entry"]["password"] == "TrashPass123!"

    def test_delete_nonexistent_website(self, auth_client):
        resp = auth_client.delete("/api/passwords/0/nonexistent.com", headers=csrf_headers())
        assert resp.status_code == 404

    def test_delete_invalid_index(self, auth_client):
        auth_client.post("/api/passwords/", headers=csrf_headers(), json={
            "website": "test.com",
            "username": "user",
            "password": "Pass123!",
        })
        resp = auth_client.delete("/api/passwords/99/test.com", headers=csrf_headers())
        assert resp.status_code == 400

    def test_delete_last_entry_removes_website_key(self, auth_client):
        auth_client.post("/api/passwords/", headers=csrf_headers(), json={
            "website": "single.com",
            "username": "only-user",
            "password": "Pass123!",
        })
        auth_client.delete("/api/passwords/0/single.com", headers=csrf_headers())
        vault = auth_client.get("/api/passwords/").get_json()
        assert "single.com" not in vault["passwords"]

class TestEditEntry:
    def test_edit_username(self, auth_client):
        auth_client.post("/api/passwords/", headers=csrf_headers(), json={
            "website": "edit.com",
            "username": "old-user",
            "password": "Pass123!",
        })
        resp = auth_client.put("/api/passwords/0/edit.com", headers=csrf_headers(), json={
            "username": "new-user",
        })
        assert resp.status_code == 200

        vault = auth_client.get("/api/passwords/").get_json()
        assert vault["passwords"]["edit.com"][0]["username"] == "new-user"

    def test_edit_password_creates_history(self, auth_client):
        auth_client.post("/api/passwords/", headers=csrf_headers(), json={
            "website": "history.com",
            "username": "user",
            "password": "OldPass123!",
        })
        auth_client.put("/api/passwords/0/history.com", headers=csrf_headers(), json={
            "password": "NewPass456!",
        })
        resp = auth_client.get("/api/passwords/0/history.com/history")
        history = resp.get_json()["history"]
        assert len(history) == 1
        assert history[0]["password"] == "OldPass123!"
        assert "changed_at" in history[0]

    def test_edit_same_password_no_history(self, auth_client):
        auth_client.post("/api/passwords/", headers=csrf_headers(), json={
            "website": "nochange.com",
            "username": "user",
            "password": "SamePass123!",
        })
        auth_client.put("/api/passwords/0/nochange.com", headers=csrf_headers(), json={
            "password": "SamePass123!",
        })
        resp = auth_client.get("/api/passwords/0/nochange.com/history")
        assert resp.get_json()["history"] == []

    def test_edit_nonexistent_website(self, auth_client):
        resp = auth_client.put("/api/passwords/0/missing.com", headers=csrf_headers(), json={
            "username": "new",
        })
        assert resp.status_code == 404

    def test_edit_invalid_index(self, auth_client):
        auth_client.post("/api/passwords/", headers=csrf_headers(), json={
            "website": "indexed.com",
            "username": "user",
            "password": "Pass123!",
        })
        resp = auth_client.put("/api/passwords/99/indexed.com", headers=csrf_headers(), json={
            "username": "new",
        })
        assert resp.status_code == 400

class TestPasswordHistory:
    def test_history_accumulates(self, auth_client):
        auth_client.post("/api/passwords/", headers=csrf_headers(), json={
            "website": "multi.com",
            "username": "user",
            "password": "Pass1__1234",
        })
        for i in range(3):
            auth_client.put("/api/passwords/0/multi.com", headers=csrf_headers(), json={
                "password": f"NewPass{i}___1234",
            })
        resp = auth_client.get("/api/passwords/0/multi.com/history")
        assert len(resp.get_json()["history"]) == 3

    def test_history_nonexistent_website(self, auth_client):
        resp = auth_client.get("/api/passwords/0/ghost.com/history")
        assert resp.status_code == 404