import os
import json
import time
import string
import pytest
from backend.vault import (
    derive_key,
    _aes_gcm_encrypt,
    _aes_gcm_decrypt,
    encrypt_file,
    decrypt_file,
    encrypt_export,
    decrypt_export,
    load_passwords,
    load_passwords_with_key,
    save_passwords_with_key,
    check_lockout,
    record_failed_attempt,
    clear_lockout,
    normalize_entries,
    has_totp,
    generate_backup_codes,
    generate_password,
    save_totp_data,
    load_totp_data,
    delete_totp_secret,
    VaultDecryptionError,
    SALT_SIZE,
    VAULT_MAGIC,
    FILE_MAGIC,
    EXPORT_MAGIC,
)

class TestDeriveKey:
    def test_deterministic(self):
        salt = os.urandom(SALT_SIZE)
        k1 = derive_key("password123", salt)
        k2 = derive_key("password123", salt)
        assert k1 == k2

    def test_different_salts_produce_different_keys(self):
        k1 = derive_key("password", os.urandom(SALT_SIZE))
        k2 = derive_key("password", os.urandom(SALT_SIZE))
        assert k1 != k2

    def test_different_passwords_produce_different_keys(self):
        salt = os.urandom(SALT_SIZE)
        k1 = derive_key("passwordA", salt)
        k2 = derive_key("passwordB", salt)
        assert k1 != k2

    def test_key_length_is_32_bytes(self):
        key = derive_key("test", os.urandom(SALT_SIZE))
        assert len(key) == 32

class TestAesGcm:
    def test_encrypt_decrypt_roundtrip(self):
        key = os.urandom(32)
        plaintext = b"Hello, vault!"
        aad = b"test-aad"
        encrypted = _aes_gcm_encrypt(key, plaintext, aad)
        decrypted = _aes_gcm_decrypt(key, encrypted, aad)
        assert decrypted == plaintext

    def test_wrong_key_fails(self):
        key1 = os.urandom(32)
        key2 = os.urandom(32)
        encrypted = _aes_gcm_encrypt(key1, b"secret", b"aad")
        with pytest.raises(Exception):
            _aes_gcm_decrypt(key2, encrypted, b"aad")

    def test_wrong_aad_fails(self):
        key = os.urandom(32)
        encrypted = _aes_gcm_encrypt(key, b"data", b"correct-aad")
        with pytest.raises(Exception):
            _aes_gcm_decrypt(key, encrypted, b"wrong-aad")

    def test_tampered_ciphertext_fails(self):
        key = os.urandom(32)
        encrypted = bytearray(_aes_gcm_encrypt(key, b"data", b"aad"))
        encrypted[-1] ^= 0xFF
        with pytest.raises(Exception):
            _aes_gcm_decrypt(key, bytes(encrypted), b"aad")

class TestEncryptDecryptFile:
    def test_roundtrip(self):
        key = os.urandom(32)
        data = b"file content here"
        encrypted = encrypt_file(key, data)
        assert encrypted[:4] == FILE_MAGIC
        decrypted = decrypt_file(key, encrypted)
        assert decrypted == data

    def test_wrong_key_raises(self):
        key1 = os.urandom(32)
        key2 = os.urandom(32)
        encrypted = encrypt_file(key1, b"secret file")
        with pytest.raises(VaultDecryptionError, match="Failed to decrypt"):
            decrypt_file(key2, encrypted)

    def test_too_short_raises(self):
        key = os.urandom(32)
        with pytest.raises(VaultDecryptionError, match="too short"):
            decrypt_file(key, b"tiny")

    def test_wrong_magic_raises(self):
        key = os.urandom(32)
        bad_data = b"XXXX" + os.urandom(100)
        with pytest.raises(VaultDecryptionError, match="Invalid encrypted file"):
            decrypt_file(key, bad_data)

class TestEncryptDecryptExport:
    def test_roundtrip(self):
        password = "ExportPass123"
        data = b'{"entries": []}'
        encrypted = encrypt_export(password, data)
        assert encrypted[:4] == EXPORT_MAGIC
        decrypted = decrypt_export(password, encrypted)
        assert decrypted == data

    def test_wrong_password_raises(self):
        encrypted = encrypt_export("correct", b"data")
        with pytest.raises(VaultDecryptionError, match="Wrong password"):
            decrypt_export("wrong", encrypted)

    def test_too_short_raises(self):
        with pytest.raises(VaultDecryptionError, match="too short"):
            decrypt_export("pass", b"tiny")

    def test_wrong_magic_raises(self):
        bad_data = b"ZZZZ" + os.urandom(100)
        with pytest.raises(VaultDecryptionError, match="Invalid encrypted export"):
            decrypt_export("pass", bad_data)

class TestLoadSavePasswords:
    def test_load_nonexistent_vault_returns_empty(self, tmp_path):
        vault = str(tmp_path / "missing.enc")
        salt, data, key = load_passwords("password123", vault)
        assert salt is not None
        assert data == {}
        assert key is not None

    def test_save_then_load(self, tmp_path):
        vault = str(tmp_path / "vault.enc")
        salt = os.urandom(SALT_SIZE)
        key = derive_key("TestPassword1", salt)
        passwords = {"example.com": [{"username": "user", "password": "pass123"}]}
        save_passwords_with_key(key, salt, passwords, vault)

        loaded_salt, loaded_data, loaded_key = load_passwords("TestPassword1", vault)
        assert loaded_data == passwords
        assert loaded_key == key

    def test_load_with_wrong_password(self, tmp_path):
        vault = str(tmp_path / "vault.enc")
        salt = os.urandom(SALT_SIZE)
        key = derive_key("CorrectPassword1", salt)
        save_passwords_with_key(key, salt, {"site": [{"password": "x"}]}, vault)

        s, d, k = load_passwords("WrongPassword1", vault)
        assert d is None

    def test_load_corrupted_vault(self, tmp_path):
        vault = str(tmp_path / "vault.enc")
        with open(vault, "wb") as f:
            f.write(VAULT_MAGIC + os.urandom(SALT_SIZE) + b"corrupted-data")

        s, d, k = load_passwords("anything", vault)
        assert d is None

    def test_load_too_short_vault(self, tmp_path):
        vault = str(tmp_path / "vault.enc")
        with open(vault, "wb") as f:
            f.write(b"tiny")

        s, d, k = load_passwords("anything", vault)
        assert d is None

    def test_load_wrong_magic_vault(self, tmp_path):
        vault = str(tmp_path / "vault.enc")
        with open(vault, "wb") as f:
            f.write(b"XXXX" + os.urandom(100))

        s, d, k = load_passwords("anything", vault)
        assert d is None

    def test_load_with_key(self, tmp_path):
        vault = str(tmp_path / "vault.enc")
        salt = os.urandom(SALT_SIZE)
        key = derive_key("MyPassword123", salt)
        original = {"site.com": [{"password": "abc"}]}
        save_passwords_with_key(key, salt, original, vault)

        data = load_passwords_with_key(key, vault)
        assert data == original

    def test_load_with_wrong_key_raises(self, tmp_path):
        vault = str(tmp_path / "vault.enc")
        salt = os.urandom(SALT_SIZE)
        key = derive_key("GoodPassword1", salt)
        save_passwords_with_key(key, salt, {}, vault)

        wrong_key = derive_key("BadPassword1", salt)
        with pytest.raises(VaultDecryptionError):
            load_passwords_with_key(wrong_key, vault)

    def test_load_with_key_nonexistent_returns_empty(self, tmp_path):
        vault = str(tmp_path / "missing.enc")
        data = load_passwords_with_key(os.urandom(32), vault)
        assert data == {}

class TestLockout:
    def test_no_lockout_initially(self, tmp_path):
        lockout = str(tmp_path / "lockout.json")
        is_locked, remaining = check_lockout(lockout)
        assert is_locked is False
        assert remaining == 0

    def test_failed_attempts_below_max_no_lockout(self, tmp_path):
        lockout = str(tmp_path / "lockout.json")
        locked, _ = record_failed_attempt(lockout, max_attempts=3)
        assert locked is False
        locked, _ = record_failed_attempt(lockout, max_attempts=3)
        assert locked is False

    def test_lockout_triggered_at_max_attempts(self, tmp_path):
        lockout = str(tmp_path / "lockout.json")
        for _ in range(2):
            record_failed_attempt(lockout, max_attempts=3)
        locked, seconds = record_failed_attempt(lockout, max_attempts=3)
        assert locked is True
        assert seconds > 0

    def test_locked_vault_detected(self, tmp_path):
        lockout = str(tmp_path / "lockout.json")
        for _ in range(3):
            record_failed_attempt(lockout, max_attempts=3)
        is_locked, remaining = check_lockout(lockout)
        assert is_locked is True
        assert remaining > 0

    def test_clear_lockout(self, tmp_path):
        lockout = str(tmp_path / "lockout.json")
        for _ in range(3):
            record_failed_attempt(lockout, max_attempts=3)
        clear_lockout(lockout)
        is_locked, _ = check_lockout(lockout)
        assert is_locked is False

    def test_clear_nonexistent_lockout_no_error(self, tmp_path):
        lockout = str(tmp_path / "missing_lockout.json")
        clear_lockout(lockout)

    def test_corrupted_lockout_file_handled(self, tmp_path):
        lockout = str(tmp_path / "lockout.json")
        with open(lockout, "w") as f:
            f.write("not-valid-json{{{")
        is_locked, _ = check_lockout(lockout)
        assert is_locked is False

class TestNormalizeEntries:
    def test_dict_wrapped_in_list(self):
        result = normalize_entries({"password": "abc"})
        assert result == [{"password": "abc"}]

    def test_list_returned_as_is(self):
        entries = [{"password": "a"}, {"password": "b"}]
        assert normalize_entries(entries) is entries

class TestHasTotp:
    def test_returns_false_when_missing(self, tmp_path):
        assert has_totp(str(tmp_path / "nope.enc")) is False

    def test_returns_true_when_exists(self, tmp_path):
        totp_file = tmp_path / ".totp.enc"
        totp_file.write_bytes(b"data")
        assert has_totp(str(totp_file)) is True

class TestGenerateBackupCodes:
    def test_default_count_and_length(self):
        codes = generate_backup_codes()
        assert len(codes) == 10
        for code in codes:
            assert len(code) == 8

    def test_custom_count(self):
        codes = generate_backup_codes(count=5)
        assert len(codes) == 5

    def test_custom_length(self):
        codes = generate_backup_codes(length=12)
        for code in codes:
            assert len(code) == 12

    def test_codes_are_alphanumeric_lowercase(self):
        valid = set(string.ascii_lowercase + string.digits)
        for code in generate_backup_codes():
            assert all(c in valid for c in code)

    def test_codes_are_unique(self):
        codes = generate_backup_codes(count=100, length=16)
        assert len(set(codes)) == len(codes)

class TestGeneratePassword:
    def test_default_length(self):
        pwd = generate_password()
        assert len(pwd) == 16

    def test_custom_length(self):
        pwd = generate_password(length=24)
        assert len(pwd) == 24

    def test_minimum_length_enforced(self):
        pwd = generate_password(length=1)
        assert len(pwd) >= 4

    def test_contains_required_characters(self):
        pwd = generate_password(length=20)
        assert any(c in string.ascii_lowercase for c in pwd)
        assert any(c in string.ascii_uppercase for c in pwd)
        assert any(c in string.digits for c in pwd)
        assert any(c in "!@#$%&*?=_+" for c in pwd)

    def test_no_special_characters(self):
        pwd = generate_password(length=20, include_special=False)
        assert all(c not in "!@#$%&*?=_+" for c in pwd)
        assert any(c in string.ascii_lowercase for c in pwd)
        assert any(c in string.ascii_uppercase for c in pwd)
        assert any(c in string.digits for c in pwd)

    def test_minimum_length_without_special(self):
        pwd = generate_password(length=1, include_special=False)
        assert len(pwd) >= 3

class TestTotpData:
    def test_save_and_load_roundtrip(self, tmp_path):
        totp_path = str(tmp_path / ".totp.enc")
        salt = os.urandom(SALT_SIZE)
        key = derive_key("TotpPassword123", salt)
        totp_data = {"secret": "JBSWY3DPEHPK3PXP", "backup_codes": ["abc123", "def456"]}

        save_totp_data(key, salt, totp_data, totp_path)
        loaded = load_totp_data(key, totp_path)
        assert loaded == totp_data

    def test_load_nonexistent_returns_none(self, tmp_path):
        result = load_totp_data(os.urandom(32), str(tmp_path / "nope.enc"))
        assert result is None

    def test_load_with_wrong_key_returns_none(self, tmp_path):
        totp_path = str(tmp_path / ".totp.enc")
        salt = os.urandom(SALT_SIZE)
        key = derive_key("RightPassword1", salt)
        save_totp_data(key, salt, {"secret": "ABC"}, totp_path)

        wrong_key = derive_key("WrongPassword1", salt)
        result = load_totp_data(wrong_key, totp_path)
        assert result is None

    def test_delete_totp(self, tmp_path):
        totp_path = str(tmp_path / ".totp.enc")
        with open(totp_path, "wb") as f:
            f.write(b"data")
        assert os.path.exists(totp_path)
        delete_totp_secret(totp_path)
        assert not os.path.exists(totp_path)

    def test_delete_nonexistent_no_error(self, tmp_path):
        delete_totp_secret(str(tmp_path / "nope.enc"))