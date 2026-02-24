# Password Vault

A secure, self-hosted password manager with a web dashboard, CLI, and browser extension. All data is encrypted locally using AES-256-GCM.

## Quick Start

### Docker

```bash
docker compose up -d
```

### Manual

**Requirements:** Python 3.11+, Node.js (build-time only)

```bash
pip install -r requirements.txt
cd frontend && npm install && npm run build && cd ..
python app.py
```

Open `http://<your-local-ip>:5000` — accessible on your local network.

### Command Line

```bash
python run.py
```

Both interfaces share the same `vault.enc` file. On first run you'll create a master password (min 12 chars, uppercase + lowercase + digit required). **There is no recovery if you forget it.**

## Features

### Credentials & Vault

- Store passwords with website, username, and optional notes
- Multiple credentials per website
- Recovery questions storage per entry
- Search and filter across all entries
- Duplicate detection on import

### Secure Notes

- Create standalone encrypted notes with title and content
- Organize notes into folders

### File Storage

- Upload and encrypt files (up to 5 MB each)
- Download, label, and organize stored files

### Folders

- Organize credentials, notes, and files into custom folders
- Rename or delete folders with cascading updates

### Password Generator

- Configurable length (4-128 characters)
- Optional special characters
- Guaranteed character-class coverage using CSPRNG

### Breach Checking

- Check passwords against the Have I Been Pwned database
- Per-password and vault-wide breach reports

### Import / Export

- Export to JSON, CSV, or encrypted `.enc` format
- Import from `.json`, `.csv`, or `.enc` files
- Selective export by folder
- Automatic duplicate skipping

### Two-Factor Authentication

- Optional TOTP-based 2FA with QR code setup
- 10 single-use backup codes with regeneration
- Rate limiting and replay protection

### Browser Extension

- Chrome extension with popup UI
- Auto-fill credentials into login forms
- Save new credentials detected from pages
- Domain-aware credential matching
- 2FA support within the extension

### Web Dashboard

- React SPA with dark/light mode
- Security score and password strength analytics
- Sidebar folder navigation
- Command palette (Ctrl+K)
- Drag-and-drop file uploads
- Auto-lock on tab switch and inactivity timeout

### CLI Interface

- Menu-driven terminal interface
- Add, retrieve, and generate passwords
- Clipboard copy with auto-clear
- 2FA management

## Security

| Layer              | Detail                                                                       |
|--------------------|------------------------------------------------------------------------------|
| Encryption         | AES-256-GCM                                                                  |
| Key derivation     | Argon2id (3 iterations, 64 MB, 4 threads)                                    |
| Password generation| `secrets` module (CSPRNG)                                                    |
| Clipboard          | Auto-clears after 10 s, on tab switch, and on page close                     |
| Login protection   | 3 attempts, then time-locked (persists across restarts)                      |
| 2FA                | TOTP with rate limiting and replay protection                                |
| Sessions           | Server-side encrypted, HttpOnly + SameSite=Strict + Secure cookies           |
| Inactivity         | Auto-lock after 5 minutes                                                    |
| HTTP headers       | CSP, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy, COOP/CORP    |
| Docker             | Non-root user, read-only filesystem, no-new-privileges                       |
| Input validation   | Length limits and character restrictions on all fields                        |
