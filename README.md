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

Open `http://<your-local-ip>:5000`. The server is accessible on your local network. Find your local IP with `ipconfig` (Windows) or `ifconfig` / `ip a` (Linux/macOS).

### CLI

```bash
python run.py
```

Both interfaces share the same `vault.enc` file. On first run you'll be asked to create a master password (minimum 12 characters, must include uppercase, lowercase, and a digit). **There is no recovery if you forget it.**

## Two-Factor Authentication (2FA)

The web interface supports optional TOTP-based two-factor authentication.

### Setup

1. Log in to the vault and go to the settings and click the **2FA** button.
2. Scan the QR code with any authenticator app (Google Authenticator, Authy, etc.).
3. Enter the 6-digit code from your app to confirm setup.
4. Save the 10 backup codes shown after confirmation. Each backup code is single-use.

### Managing 2FA

- **Disable:** Click the 2FA button in the settings and enter a valid code to turn it off.
- **Regenerate backup codes:** Click "Regenerate" and confirm with a valid code. This invalidates all previous backup codes.

## Import / Export

The web interface supports importing and exporting vault entries.

- **Export** to JSON, CSV, or password-protected encrypted (`.enc`) format.
- **Import** from `.json`, `.csv`, or `.enc` files. Exact duplicates are skipped automatically.

Encrypted exports use AES-256-GCM with an independent Argon2id-derived key. Unencrypted exports contain plaintext passwords — use the encrypted format when possible.

## Security Overview

| Layer | Detail |
|-------|--------|
| Key derivation | Argon2id (3 iterations, 64 MB, 4 threads) |
| Encryption | AES-256-GCM |
| Salt | 16-byte random salt per vault |
| Password generation | `secrets` module (CSPRNG), guaranteed character-class coverage |
| Clipboard | Auto-clears after 10 s, on tab switch, and on page close |
| Login protection | 3 attempts, then time-locked (persists across restarts) |
| 2FA | Optional TOTP with server-side rate limiting and replay protection |
| Inactivity | Session exits after 5 minutes of inactivity |
| Web session | Server-side only, AES-256-GCM encrypted values, HttpOnly + SameSite=Strict + Secure cookies |
| Network | Accessible on local network; not exposed to the internet unless ports are forwarded |
| HTTP headers | CSP, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy, COOP/CORP, no-cache |
| Docker | Non-root user, read-only filesystem, no-new-privileges |
| Encrypted export | AES-256-GCM with independent Argon2id salt |
| Input validation | Length limits and character restrictions on all vault fields |