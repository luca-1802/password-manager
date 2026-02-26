import os
import json
import pytest
from datetime import datetime, timezone, timedelta
from backend.vault import load_passwords_with_key, save_passwords_with_key, SALT_SIZE, derive_key
from tests.conftest import csrf_headers

def _get_vault_material(seeded_vault):
    key, salt, vault_path = seeded_vault
    return key, salt, vault_path

def _load_vault(key, vault_path):
    return load_passwords_with_key(key, vault_path)

def _save_vault(key, salt, vault_path, passwords):
    save_passwords_with_key(key, salt, passwords, vault_path)

def _create_password_via_api(auth_client, website="test.com", username="user", password="Pass123!"):
    resp = auth_client.post("/api/passwords/", headers=csrf_headers(), json={
        "website": website,
        "username": username,
        "password": password,
    })
    return resp

def _create_note_via_api(auth_client, title="test note", content="note content"):
    resp = auth_client.post("/api/notes/", headers=csrf_headers(), json={
        "title": title,
        "content": content,
    })
    return resp

def _delete_password_via_api(auth_client, index, website):
    return auth_client.delete(f"/api/passwords/{index}/{website}", headers=csrf_headers())

def _delete_note_via_api(auth_client, index, title):
    return auth_client.delete(f"/api/notes/{index}/{title}", headers=csrf_headers())

def _delete_file_via_api(auth_client, index, label):
    return auth_client.delete(f"/api/files/{index}/{label}", headers=csrf_headers())

def _create_file_entry_in_vault(key, salt, vault_path, label="testfile", file_id="abc12345"):
    passwords = load_passwords_with_key(key, vault_path)
    files_data = passwords.get("_files", {})
    if not isinstance(files_data, dict):
        files_data = {}
    if label not in files_data:
        files_data[label] = []
    entry = {
        "type": "file",
        "file_id": file_id,
        "original_name": "test.txt",
        "size": 14,
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
    }
    files_data[label].append(entry)
    passwords["_files"] = files_data
    save_passwords_with_key(key, salt, passwords, vault_path)

    files_dir = os.path.join(os.path.dirname(vault_path), "files")
    os.makedirs(files_dir, exist_ok=True)
    enc_path = os.path.join(files_dir, f"{file_id}.enc")
    with open(enc_path, "wb") as f:
        f.write(b"encrypted data")
    return entry, enc_path

class TestTrashList:
    def test_empty_trash(self, auth_client):
        resp = auth_client.get("/api/trash/")
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["items"] == []
        assert data["count"] == 0

    def test_trash_after_delete(self, auth_client):
        _create_password_via_api(auth_client, website="trashme.com", username="user1", password="Secret123!")
        _delete_password_via_api(auth_client, 0, "trashme.com")

        resp = auth_client.get("/api/trash/")
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["count"] == 1
        assert len(data["items"]) == 1
        item = data["items"][0]
        assert item["entry_type"] == "password"
        assert item["original_key"] == "trashme.com"
        assert item["entry"]["username"] == "user1"
        assert item["entry"]["password"] == "Secret123!"

    def test_trash_metadata_fields(self, auth_client):
        _create_password_via_api(auth_client, website="meta.com", username="u", password="P123!")
        _delete_password_via_api(auth_client, 0, "meta.com")

        resp = auth_client.get("/api/trash/")
        data = resp.get_json()
        item = data["items"][0]

        assert "id" in item
        assert isinstance(item["id"], str)
        assert len(item["id"]) == 8
        assert "entry_type" in item
        assert "original_key" in item
        assert "entry" in item
        assert "deleted_at" in item
        assert "expires_at" in item

        deleted_at = datetime.fromisoformat(item["deleted_at"])
        expires_at = datetime.fromisoformat(item["expires_at"])
        delta = expires_at - deleted_at
        assert 29 <= delta.days <= 31

    def test_auto_purge_expired(self, auth_client, seeded_vault):
        key, salt, vault_path = _get_vault_material(seeded_vault)

        passwords = _load_vault(key, vault_path)
        now = datetime.now(timezone.utc)
        passwords["_trash"] = [{
            "id": "expired1",
            "entry_type": "password",
            "original_key": "old.com",
            "entry": {"password": "oldpass", "username": "olduser"},
            "deleted_at": (now - timedelta(days=31)).isoformat(),
            "expires_at": (now - timedelta(days=1)).isoformat(),
        }]
        _save_vault(key, salt, vault_path, passwords)

        resp = auth_client.get("/api/trash/")
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["count"] == 0
        assert data["items"] == []

class TestTrashRestore:
    def test_restore_password(self, auth_client):
        _create_password_via_api(auth_client, website="restore.com", username="restoreuser", password="Restore123!")
        _delete_password_via_api(auth_client, 0, "restore.com")

        trash_resp = auth_client.get("/api/trash/")
        trash_data = trash_resp.get_json()
        assert trash_data["count"] == 1
        trash_id = trash_data["items"][0]["id"]

        vault_resp = auth_client.get("/api/passwords/")
        assert "restore.com" not in vault_resp.get_json()["passwords"]

        restore_resp = auth_client.post(f"/api/trash/{trash_id}/restore", headers=csrf_headers())
        assert restore_resp.status_code == 200
        assert restore_resp.get_json()["success"] is True

        vault_resp = auth_client.get("/api/passwords/")
        passwords = vault_resp.get_json()["passwords"]
        assert "restore.com" in passwords
        assert passwords["restore.com"][0]["username"] == "restoreuser"

        trash_resp = auth_client.get("/api/trash/")
        assert trash_resp.get_json()["count"] == 0

    def test_restore_note(self, auth_client):
        _create_note_via_api(auth_client, title="restorable note", content="my content")
        _delete_note_via_api(auth_client, 0, "restorable note")

        trash_resp = auth_client.get("/api/trash/")
        trash_data = trash_resp.get_json()
        assert trash_data["count"] == 1
        trash_id = trash_data["items"][0]["id"]
        assert trash_data["items"][0]["entry_type"] == "note"

        vault_resp = auth_client.get("/api/passwords/")
        notes = vault_resp.get_json()["notes"]
        assert "restorable note" not in notes

        restore_resp = auth_client.post(f"/api/trash/{trash_id}/restore", headers=csrf_headers())
        assert restore_resp.status_code == 200

        vault_resp = auth_client.get("/api/passwords/")
        notes = vault_resp.get_json()["notes"]
        assert "restorable note" in notes
        assert notes["restorable note"][0]["content"] == "my content"

        trash_resp = auth_client.get("/api/trash/")
        assert trash_resp.get_json()["count"] == 0

    def test_restore_file(self, auth_client, seeded_vault):
        key, salt, vault_path = _get_vault_material(seeded_vault)
        file_id = "restfile1"
        entry, enc_path = _create_file_entry_in_vault(key, salt, vault_path, label="restorable", file_id=file_id)

        _delete_file_via_api(auth_client, 0, "restorable")
        assert os.path.exists(enc_path)

        trash_resp = auth_client.get("/api/trash/")
        trash_data = trash_resp.get_json()
        assert trash_data["count"] == 1
        trash_id = trash_data["items"][0]["id"]
        assert trash_data["items"][0]["entry_type"] == "file"

        restore_resp = auth_client.post(f"/api/trash/{trash_id}/restore", headers=csrf_headers())
        assert restore_resp.status_code == 200
        assert os.path.exists(enc_path)

        vault_resp = auth_client.get("/api/passwords/")
        files = vault_resp.get_json()["files"]
        assert "restorable" in files
        assert files["restorable"][0]["file_id"] == file_id

        trash_resp = auth_client.get("/api/trash/")
        assert trash_resp.get_json()["count"] == 0

    def test_restore_nonexistent(self, auth_client):
        resp = auth_client.post("/api/trash/badid123/restore", headers=csrf_headers())
        assert resp.status_code == 404

    def test_restore_to_existing_key(self, auth_client):
        _create_password_via_api(auth_client, website="multi.com", username="user1", password="Pass1___1")
        _create_password_via_api(auth_client, website="multi.com", username="user2", password="Pass2___2")
        _delete_password_via_api(auth_client, 0, "multi.com")

        vault_resp = auth_client.get("/api/passwords/")
        entries = vault_resp.get_json()["passwords"]["multi.com"]
        assert len(entries) == 1
        assert entries[0]["username"] == "user2"

        trash_resp = auth_client.get("/api/trash/")
        trash_id = trash_resp.get_json()["items"][0]["id"]

        auth_client.post(f"/api/trash/{trash_id}/restore", headers=csrf_headers())

        vault_resp = auth_client.get("/api/passwords/")
        entries = vault_resp.get_json()["passwords"]["multi.com"]
        assert len(entries) == 2
        usernames = {e["username"] for e in entries}
        assert "user1" in usernames
        assert "user2" in usernames

class TestTrashPermanentDelete:
    def test_permanent_delete_password(self, auth_client):
        _create_password_via_api(auth_client, website="permanent.com", username="u", password="Perm123!")
        _delete_password_via_api(auth_client, 0, "permanent.com")

        trash_resp = auth_client.get("/api/trash/")
        trash_id = trash_resp.get_json()["items"][0]["id"]

        del_resp = auth_client.delete(f"/api/trash/{trash_id}", headers=csrf_headers())
        assert del_resp.status_code == 200
        assert del_resp.get_json()["success"] is True

        trash_resp = auth_client.get("/api/trash/")
        assert trash_resp.get_json()["count"] == 0

        vault_resp = auth_client.get("/api/passwords/")
        assert "permanent.com" not in vault_resp.get_json()["passwords"]

    def test_permanent_delete_file_removes_physical(self, auth_client, seeded_vault):
        key, salt, vault_path = _get_vault_material(seeded_vault)
        file_id = "permfile1"
        entry, enc_path = _create_file_entry_in_vault(key, salt, vault_path, label="permfile", file_id=file_id)

        _delete_file_via_api(auth_client, 0, "permfile")
        assert os.path.exists(enc_path)

        trash_resp = auth_client.get("/api/trash/")
        trash_id = trash_resp.get_json()["items"][0]["id"]

        del_resp = auth_client.delete(f"/api/trash/{trash_id}", headers=csrf_headers())
        assert del_resp.status_code == 200
        assert not os.path.exists(enc_path)

    def test_permanent_delete_nonexistent(self, auth_client):
        resp = auth_client.delete("/api/trash/noexist1", headers=csrf_headers())
        assert resp.status_code == 404

class TestTrashEmpty:
    def test_empty_trash_all(self, auth_client):
        _create_password_via_api(auth_client, website="empty1.com", username="u1", password="P1______1")
        _create_password_via_api(auth_client, website="empty2.com", username="u2", password="P2______2")
        _create_note_via_api(auth_client, title="empty note", content="bye")
        _delete_password_via_api(auth_client, 0, "empty1.com")
        _delete_password_via_api(auth_client, 0, "empty2.com")
        _delete_note_via_api(auth_client, 0, "empty note")

        trash_resp = auth_client.get("/api/trash/")
        assert trash_resp.get_json()["count"] == 3

        empty_resp = auth_client.delete("/api/trash/", headers=csrf_headers())
        assert empty_resp.status_code == 200
        data = empty_resp.get_json()
        assert data["success"] is True
        assert data["purged"] == 3

        trash_resp = auth_client.get("/api/trash/")
        assert trash_resp.get_json()["count"] == 0

    def test_empty_already_empty(self, auth_client):
        resp = auth_client.delete("/api/trash/", headers=csrf_headers())
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["success"] is True
        assert data["purged"] == 0

class TestSoftDelete:
    def test_delete_password_moves_to_trash(self, auth_client):
        _create_password_via_api(auth_client, website="soft.com", username="softuser", password="Soft123!")
        _delete_password_via_api(auth_client, 0, "soft.com")

        vault_resp = auth_client.get("/api/passwords/")
        assert "soft.com" not in vault_resp.get_json()["passwords"]

        trash_resp = auth_client.get("/api/trash/")
        data = trash_resp.get_json()
        assert data["count"] == 1
        item = data["items"][0]
        assert item["entry_type"] == "password"
        assert item["original_key"] == "soft.com"
        assert item["entry"]["username"] == "softuser"
        assert item["entry"]["password"] == "Soft123!"

    def test_delete_note_moves_to_trash(self, auth_client):
        _create_note_via_api(auth_client, title="soft note", content="soft content")
        _delete_note_via_api(auth_client, 0, "soft note")

        vault_resp = auth_client.get("/api/passwords/")
        notes = vault_resp.get_json()["notes"]
        assert "soft note" not in notes

        trash_resp = auth_client.get("/api/trash/")
        data = trash_resp.get_json()
        assert data["count"] == 1
        item = data["items"][0]
        assert item["entry_type"] == "note"
        assert item["original_key"] == "soft note"
        assert item["entry"]["content"] == "soft content"

    def test_delete_file_keeps_physical(self, auth_client, seeded_vault):
        key, salt, vault_path = _get_vault_material(seeded_vault)
        file_id = "keepfile1"
        entry, enc_path = _create_file_entry_in_vault(key, salt, vault_path, label="keepfile", file_id=file_id)

        _delete_file_via_api(auth_client, 0, "keepfile")

        assert os.path.exists(enc_path)

        trash_resp = auth_client.get("/api/trash/")
        data = trash_resp.get_json()
        assert data["count"] == 1
        assert data["items"][0]["entry_type"] == "file"
        assert data["items"][0]["entry"]["file_id"] == file_id

class TestReservedKeys:
    def test_trash_key_reserved(self, auth_client):
        resp = auth_client.post("/api/passwords/", headers=csrf_headers(), json={
            "website": "_trash",
            "username": "user",
            "password": "Pass123!",
        })
        assert resp.status_code == 400

class TestAutoPurge:
    def test_expired_purged_on_list(self, auth_client, seeded_vault):
        key, salt, vault_path = _get_vault_material(seeded_vault)

        now = datetime.now(timezone.utc)
        passwords = _load_vault(key, vault_path)
        passwords["_trash"] = [
            {
                "id": "expitem1",
                "entry_type": "password",
                "original_key": "expired.com",
                "entry": {"password": "gone", "username": "gone"},
                "deleted_at": (now - timedelta(days=35)).isoformat(),
                "expires_at": (now - timedelta(days=5)).isoformat(),
            },
            {
                "id": "fresh01",
                "entry_type": "password",
                "original_key": "fresh.com",
                "entry": {"password": "still", "username": "here"},
                "deleted_at": now.isoformat(),
                "expires_at": (now + timedelta(days=25)).isoformat(),
            },
        ]
        _save_vault(key, salt, vault_path, passwords)

        resp = auth_client.get("/api/trash/")
        data = resp.get_json()
        assert data["count"] == 1
        assert data["items"][0]["id"] == "fresh01"

    def test_expired_file_physical_deleted(self, auth_client, seeded_vault):
        key, salt, vault_path = _get_vault_material(seeded_vault)

        file_id = "expfiled1"
        files_dir = os.path.join(os.path.dirname(vault_path), "files")
        os.makedirs(files_dir, exist_ok=True)
        enc_path = os.path.join(files_dir, f"{file_id}.enc")
        with open(enc_path, "wb") as f:
            f.write(b"encrypted data")

        now = datetime.now(timezone.utc)
        passwords = _load_vault(key, vault_path)
        passwords["_trash"] = [{
            "id": "expfile1",
            "entry_type": "file",
            "original_key": "expiredfile",
            "entry": {
                "type": "file",
                "file_id": file_id,
                "original_name": "old.txt",
                "size": 14,
            },
            "deleted_at": (now - timedelta(days=35)).isoformat(),
            "expires_at": (now - timedelta(days=5)).isoformat(),
        }]
        _save_vault(key, salt, vault_path, passwords)

        assert os.path.exists(enc_path)

        resp = auth_client.get("/api/trash/")
        assert resp.status_code == 200
        assert resp.get_json()["count"] == 0
        assert not os.path.exists(enc_path)