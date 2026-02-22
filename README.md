# Password Vault

A secure command-line password manager built with Python. Stores credentials in an encrypted local vault file.

## Requirements

- Python 3.8+
- `cryptography`
- `argon2-cffi`

## Setup

```bash
pip install cryptography argon2-cffi
```

## Usage

```bash
python run.py
```

On first run you'll be asked to create a master password (minimum 8 characters). This password encrypts your vault -- **there is no recovery if you forget it**.

### Menu Options

1. **Add a new password** -- enter a website, username, and password (or leave blank to auto-generate)
2. **Get an existing password** -- look up credentials by website name (password is copied to clipboard)
3. **Generate a secure password** -- generate a random password with custom length
4. **Exit** -- close the vault

## Security Overview

| Layer | Detail |
|-------|--------|
| Key derivation | Argon2id (3 iterations, 64MB, 4 threads) |
| Encryption | Fernet (AES-128-CBC + HMAC-SHA256) |
| Salt | 16-byte random salt per vault |
| Password generation | `secrets` module (CSPRNG) |
| Clipboard | Auto-clears after 10 seconds |
| Login protection | 3 attempts, then time-locked (persists across restarts) |
| Inactivity | Session exits after 5 minutes |