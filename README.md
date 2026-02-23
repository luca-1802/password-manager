# Password Vault

A secure password manager with both a CLI and a locally-hosted web interface. All credentials are stored in an encrypted vault file.

## Quick Start (Docker)

```bash
docker compose up -d
```

## Manual Setup

**Requirements:** Python 3.11+, Node.js (build-time only)

```bash
pip install -r requirements.txt
cd frontend && npm install && npm run build && cd ..
python app.py
```

Open `http://127.0.0.1:5000`. The server only binds to localhost.

### CLI

```bash
python run.py
```

Both interfaces share the same `vault.enc` file. On first run you'll be asked to create a master password (minimum 12 characters, must include uppercase, lowercase, and a digit). **There is no recovery if you forget it.**

## Security Overview

| Layer | Detail |
|-------|--------|
| Key derivation | Argon2id (3 iterations, 64 MB, 4 threads) |
| Encryption | Fernet (AES-128-CBC + HMAC-SHA256) |
| Salt | 16-byte random salt per vault |
| Password generation | `secrets` module (CSPRNG), guaranteed character-class coverage |
| Clipboard | Auto-clears after 10 s, on tab switch, and on page close |
| Login protection | 3 attempts, then time-locked (persists across restarts) |
| Inactivity | Session exits after 5 minutes of inactivity |
| Web session | Server-side only, HttpOnly + SameSite=Strict + Secure cookies |
| Network | Binds to 127.0.0.1 (localhost only, including Docker) |
| HTTP headers | CSP, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy, COOP/CORP, no-cache |
| Docker | Non-root user, read-only filesystem, no-new-privileges |
| Input validation | Length limits and character restrictions on all vault fields |