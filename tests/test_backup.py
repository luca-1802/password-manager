import os
import time
import pytest
from backend.backup import (
    create_backup,
    prune_backups,
    list_backups,
    restore_backup,
    _make_backup_filename,
)

@pytest.fixture
def vault_file(tmp_path, monkeypatch):
    vault = tmp_path / "vault.enc"
    vault.write_bytes(b"PV02" + os.urandom(64))
    monkeypatch.delenv("BACKUP_DIR", raising=False)
    return str(vault)

class TestCreateBackup:
    def test_creates_backup_file(self, vault_file):
        result = create_backup(vault_file)
        assert result is not None
        assert os.path.exists(result)

    def test_backup_contents_match(self, vault_file):
        with open(vault_file, "rb") as f:
            original = f.read()
        backup_path = create_backup(vault_file)
        with open(backup_path, "rb") as f:
            backup = f.read()
        assert original == backup

    def test_returns_none_for_missing_file(self, tmp_path):
        result = create_backup(str(tmp_path / "nonexistent.enc"))
        assert result is None

    def test_backup_dir_created(self, vault_file):
        create_backup(vault_file)
        backup_dir = os.path.join(os.path.dirname(vault_file), "backups")
        assert os.path.isdir(backup_dir)

    def test_multiple_backups_unique_names(self, vault_file):
        r1 = create_backup(vault_file)
        time.sleep(1.1)
        r2 = create_backup(vault_file)
        assert r1 != r2
        assert os.path.exists(r1)
        assert os.path.exists(r2)

    def test_custom_backup_dir(self, vault_file, tmp_path, monkeypatch):
        custom = str(tmp_path / "custom_backups")
        monkeypatch.setenv("BACKUP_DIR", custom)
        result = create_backup(vault_file)
        assert result is not None
        assert result.startswith(custom)

class TestPruneBackups:
    def test_prune_by_max_count(self, vault_file):
        for _ in range(5):
            create_backup(vault_file)
            time.sleep(0.05)
        assert len(list_backups(vault_file)) == 5
        prune_backups(vault_file, max_backups=3)
        assert len(list_backups(vault_file)) == 3

    def test_prune_keeps_newest(self, vault_file):
        for _ in range(5):
            create_backup(vault_file)
            time.sleep(0.05)
        newest = list_backups(vault_file)[0]["filename"]
        prune_backups(vault_file, max_backups=1)
        remaining = list_backups(vault_file)
        assert len(remaining) == 1
        assert remaining[0]["filename"] == newest

    def test_prune_no_error_when_empty(self, vault_file):
        prune_backups(vault_file, max_backups=5)

    def test_prune_no_error_when_no_backup_dir(self, tmp_path):
        prune_backups(str(tmp_path / "missing.enc"), max_backups=5)

    def test_prune_respects_env_max_count(self, vault_file, monkeypatch):
        for _ in range(5):
            create_backup(vault_file)
            time.sleep(0.05)
        assert len(list_backups(vault_file)) == 5
        monkeypatch.setenv("BACKUP_MAX_COUNT", "2")
        prune_backups(vault_file)
        assert len(list_backups(vault_file)) == 2

class TestListBackups:
    def test_empty_when_no_backups(self, vault_file):
        assert list_backups(vault_file) == []

    def test_lists_created_backups(self, vault_file):
        create_backup(vault_file)
        result = list_backups(vault_file)
        assert len(result) == 1
        assert "filename" in result[0]
        assert "timestamp" in result[0]
        assert "size" in result[0]

    def test_sorted_newest_first(self, vault_file):
        create_backup(vault_file)
        time.sleep(1.1)
        create_backup(vault_file)
        result = list_backups(vault_file)
        assert len(result) == 2
        assert result[0]["timestamp"] >= result[1]["timestamp"]

    def test_does_not_list_other_files(self, vault_file):
        create_backup(vault_file)
        backup_dir = os.path.join(os.path.dirname(vault_file), "backups")
        with open(os.path.join(backup_dir, "unrelated.txt"), "w") as f:
            f.write("not a backup")
        result = list_backups(vault_file)
        assert len(result) == 1

class TestRestoreBackup:
    def test_restore_replaces_vault(self, vault_file):
        original_data = open(vault_file, "rb").read()
        create_backup(vault_file)
        backup_name = list_backups(vault_file)[0]["filename"]
        with open(vault_file, "wb") as f:
            f.write(b"modified-content")
        restore_backup(backup_name, vault_file)
        assert open(vault_file, "rb").read() == original_data

    def test_restore_creates_safety_backup(self, vault_file):
        create_backup(vault_file)
        backup_name = list_backups(vault_file)[0]["filename"]
        count_before = len(list_backups(vault_file))
        with open(vault_file, "wb") as f:
            f.write(b"modified-content")
        restore_backup(backup_name, vault_file)
        count_after = len(list_backups(vault_file))
        assert count_after > count_before

    def test_restore_rejects_path_traversal(self, vault_file):
        with pytest.raises(ValueError):
            restore_backup("../../../etc/passwd", vault_file)

    def test_restore_raises_for_missing_backup(self, vault_file):
        with pytest.raises(FileNotFoundError):
            restore_backup("nonexistent.bak", vault_file)

class TestMakeBackupFilename:
    def test_no_colons_in_filename(self):
        name = _make_backup_filename("vault.enc")
        assert ":" not in name

    def test_correct_prefix_and_suffix(self):
        name = _make_backup_filename("vault.enc")
        assert name.startswith("vault.enc.")
        assert name.endswith(".bak")

    def test_contains_timestamp(self):
        name = _make_backup_filename("test.enc")
        ts_part = name[len("test.enc."):-len(".bak")]
        assert len(ts_part) == 27  # "2026-02-25T14-30-00-123456Z"
        assert ts_part.endswith("Z")