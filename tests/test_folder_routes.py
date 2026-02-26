import pytest
from tests.conftest import csrf_headers

class TestListFolders:
    def test_empty_vault_no_folders(self, auth_client):
        resp = auth_client.get("/api/folders/")
        assert resp.status_code == 200
        assert resp.get_json()["folders"] == []

    def test_unauthenticated_rejected(self, client):
        resp = client.get("/api/folders/")
        assert resp.status_code == 401

class TestCreateFolder:
    def test_create_folder(self, auth_client):
        resp = auth_client.post("/api/folders/", headers=csrf_headers(), json={
            "name": "Work",
        })
        assert resp.status_code == 201

        folders = auth_client.get("/api/folders/").get_json()["folders"]
        assert "Work" in folders

    def test_duplicate_folder_rejected(self, auth_client):
        auth_client.post("/api/folders/", headers=csrf_headers(), json={"name": "Dup"})
        resp = auth_client.post("/api/folders/", headers=csrf_headers(), json={"name": "Dup"})
        assert resp.status_code == 409
        assert "already exists" in resp.get_json()["error"]

    def test_empty_name_rejected(self, auth_client):
        resp = auth_client.post("/api/folders/", headers=csrf_headers(), json={"name": "  "})
        assert resp.status_code == 400

    def test_missing_name_rejected(self, auth_client):
        resp = auth_client.post("/api/folders/", headers=csrf_headers(), json={})
        assert resp.status_code == 400

    def test_too_long_name_rejected(self, auth_client):
        resp = auth_client.post("/api/folders/", headers=csrf_headers(), json={
            "name": "a" * 51,
        })
        assert resp.status_code == 400

    def test_invalid_characters_rejected(self, auth_client):
        resp = auth_client.post("/api/folders/", headers=csrf_headers(), json={
            "name": "Bad<Folder>",
        })
        assert resp.status_code == 400

    def test_non_string_name_rejected(self, auth_client):
        resp = auth_client.post("/api/folders/", headers=csrf_headers(), json={
            "name": 12345,
        })
        assert resp.status_code == 400

class TestRenameFolder:
    def test_rename_folder(self, auth_client):
        auth_client.post("/api/folders/", headers=csrf_headers(), json={"name": "Old"})
        resp = auth_client.put("/api/folders/Old", headers=csrf_headers(), json={
            "new_name": "New",
        })
        assert resp.status_code == 200

        folders = auth_client.get("/api/folders/").get_json()["folders"]
        assert "New" in folders
        assert "Old" not in folders

    def test_rename_updates_entries(self, auth_client):
        auth_client.post("/api/passwords/", headers=csrf_headers(), json={
            "website": "test.com",
            "username": "user",
            "password": "Pass123!",
            "folder": "OldName",
        })
        auth_client.put("/api/folders/OldName", headers=csrf_headers(), json={
            "new_name": "NewName",
        })
        vault = auth_client.get("/api/passwords/").get_json()
        assert vault["passwords"]["test.com"][0]["folder"] == "NewName"

    def test_rename_nonexistent_folder(self, auth_client):
        resp = auth_client.put("/api/folders/Ghost", headers=csrf_headers(), json={
            "new_name": "New",
        })
        assert resp.status_code == 404

    def test_rename_missing_new_name(self, auth_client):
        auth_client.post("/api/folders/", headers=csrf_headers(), json={"name": "F"})
        resp = auth_client.put("/api/folders/F", headers=csrf_headers(), json={})
        assert resp.status_code == 400

    def test_rename_empty_new_name(self, auth_client):
        auth_client.post("/api/folders/", headers=csrf_headers(), json={"name": "F"})
        resp = auth_client.put("/api/folders/F", headers=csrf_headers(), json={
            "new_name": "  ",
        })
        assert resp.status_code == 400

class TestDeleteFolder:
    def test_delete_folder(self, auth_client):
        auth_client.post("/api/folders/", headers=csrf_headers(), json={"name": "Trash"})
        resp = auth_client.delete("/api/folders/Trash", headers=csrf_headers())
        assert resp.status_code == 200

        folders = auth_client.get("/api/folders/").get_json()["folders"]
        assert "Trash" not in folders

    def test_delete_removes_folder_from_entries(self, auth_client):
        auth_client.post("/api/passwords/", headers=csrf_headers(), json={
            "website": "clean.com",
            "username": "user",
            "password": "Pass123!",
            "folder": "ToDelete",
        })
        auth_client.delete("/api/folders/ToDelete", headers=csrf_headers())
        vault = auth_client.get("/api/passwords/").get_json()
        assert "clean.com" in vault["passwords"]
        assert "folder" not in vault["passwords"]["clean.com"][0]

    def test_delete_nonexistent_folder(self, auth_client):
        resp = auth_client.delete("/api/folders/Ghost", headers=csrf_headers())
        assert resp.status_code == 404