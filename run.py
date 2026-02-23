import os
import sys
import getpass
import platform
import subprocess
import threading
import time
import pyotp

from backend.vault import (
    derive_key,
    generate_password,
    load_passwords,
    save_passwords_with_key,
    check_lockout as _check_lockout,
    record_failed_attempt as _record_failed_attempt,
    clear_lockout,
    normalize_entries,
    has_totp,
    load_totp_data,
    save_totp_data,
    delete_totp_secret,
    generate_backup_codes,
    SALT_SIZE,
)

VAULT_FILE = "vault.enc"
TOTP_FILE = ".totp.enc"
LOCKOUT_FILE = ".vault.lock"
CLIPBOARD_CLEAR_SECONDS = 10
MAX_LOGIN_ATTEMPTS = 3
MIN_MASTER_PWD_LENGTH = 12
INACTIVITY_TIMEOUT = 300

_clipboard_timer = None
_clipboard_lock = threading.Lock()

def check_lockout():
    is_locked, remaining = _check_lockout(LOCKOUT_FILE)
    if is_locked:
        print(f"Vault is locked. Try again in {remaining} seconds.")
        sys.exit(1)

def record_failed_attempt():
    locked, _ = _record_failed_attempt(LOCKOUT_FILE, MAX_LOGIN_ATTEMPTS)
    if locked:
        print(f"Too many failed attempts. Vault locked.")
    return locked

def copy_to_clipboard(text):
    global _clipboard_timer
    system = platform.system()
    try:
        if system == "Windows":
            subprocess.run(["clip"], input=text.encode(), check=True)
        elif system == "Darwin":
            subprocess.run(["pbcopy"], input=text.encode(), check=True)
        else:
            subprocess.run(["xclip", "-selection", "clipboard"], input=text.encode(), check=True)
    except (FileNotFoundError, subprocess.CalledProcessError):
        print("Could not copy to clipboard (missing clipboard utility).")
        return
    print("Copied to clipboard!")

    def clear():
        try:
            if system == "Windows":
                subprocess.run(["clip"], input=b"", check=True)
            elif system == "Darwin":
                subprocess.run(["pbcopy"], input=b"", check=True)
            else:
                subprocess.run(["xclip", "-selection", "clipboard"], input=b"", check=True)
            print("\nClipboard cleared.")
        except (FileNotFoundError, subprocess.CalledProcessError):
            pass

    with _clipboard_lock:
        if _clipboard_timer is not None:
            _clipboard_timer.cancel()
        _clipboard_timer = threading.Timer(CLIPBOARD_CLEAR_SECONDS, clear)
        _clipboard_timer.start()

def timed_input(prompt):
    start = time.time()
    result = input(prompt)
    if time.time() - start > INACTIVITY_TIMEOUT:
        print("\nSession timed out due to inactivity.")
        sys.exit(0)
    return result

def run():
    print("This is a Password Vault.")

    check_lockout()
    is_new_vault = not os.path.exists(VAULT_FILE)

    vault_key = None
    salt = None
    passwords = None

    for attempt in range(MAX_LOGIN_ATTEMPTS):
        master_pwd = getpass.getpass("Please enter your Master Password: ")

        if is_new_vault:
            if len(master_pwd) < MIN_MASTER_PWD_LENGTH:
                print(f"Master password must be at least {MIN_MASTER_PWD_LENGTH} characters.")
                continue
            confirm = getpass.getpass("Confirm your Master Password: ")
            if master_pwd != confirm:
                print("Passwords do not match.")
                continue

        salt, passwords, vault_key = load_passwords(master_pwd, VAULT_FILE)
        if passwords is None:
            print("Invalid Password")
            if record_failed_attempt():
                sys.exit(1)
            continue
        break
    else:
        print("Too many failed attempts.")
        sys.exit(1)

    clear_lockout(LOCKOUT_FILE)

    if has_totp(TOTP_FILE):
        totp_data = load_totp_data(vault_key, TOTP_FILE)
        if totp_data is None:
            print("Error: Could not decrypt 2FA configuration.")
            sys.exit(1)
        totp = pyotp.TOTP(totp_data["secret"])
        for _totp_attempt in range(3):
            code = input("Enter 2FA code (or backup code): ").strip()
            if code.isdigit() and len(code) == 6 and totp.verify(code, valid_window=1):
                break
            if code.isalnum() and len(code) == 8:
                backup_codes = totp_data.get("backup_codes", [])
                if code.lower() in backup_codes:
                    backup_codes.remove(code.lower())
                    totp_data["backup_codes"] = backup_codes
                    save_totp_data(vault_key, salt, totp_data, TOTP_FILE)
                    remaining = len(backup_codes)
                    print(f"Backup code accepted. ({remaining} remaining)")
                    break
            print("Invalid code.")
        else:
            print("Too many failed 2FA attempts.")
            sys.exit(1)

    print("Vault opened!")

    while True:
        print("What do you want to do?")
        print("1. Add a new Password")
        print("2. Get an existing Password")
        print("3. Generate a secure Password")
        print("4. Manage 2FA")
        print("5. Exit")

        choice = timed_input("Select an option (1-5): ")

        if choice == '1':
            website = timed_input("Website/App: ").lower()
            username = timed_input("Username: ")
            password = getpass.getpass("Password (leave blank to auto-generate): ")

            if not password:
                password = generate_password()
                copy_to_clipboard(password)
                print(f"Auto-generated password copied to clipboard. ({CLIPBOARD_CLEAR_SECONDS}s)")

            if website not in passwords:
                passwords[website] = []

            passwords[website] = normalize_entries(passwords[website])
            passwords[website].append({
                "username": username,
                "password": password
            })

            save_passwords_with_key(vault_key, salt, passwords, VAULT_FILE)
            print(f"Password saved for {website}!")
        elif choice == '2':
            website = timed_input("Website/App: ").lower()
            if website in passwords:
                entries = normalize_entries(passwords[website])
                print(f"\n----- {website} -----")
                for i, entry in enumerate(entries, 1):
                    if len(entries) > 1:
                        print(f"  [{i}]")
                    print(f"  Username: {entry['username']}")
                    print(f"  Password: {'*' * len(entry['password'])}")
                print("-----------------------")
                idx = 0
                if len(entries) > 1:
                    pick = timed_input("Copy password for which entry? (number): ")
                    if pick.isdigit() and 1 <= int(pick) <= len(entries):
                        idx = int(pick) - 1
                    else:
                        print("Invalid selection, defaulting to first entry.")
                copy_to_clipboard(entries[idx]['password'])
                print(f"(Auto-clears in {CLIPBOARD_CLEAR_SECONDS}s)")
            else:
                print("No saved passwords found!")
        elif choice == '3':
            length_str = timed_input("Length of the generated password (default 16): ")
            try:
                length = int(length_str) if length_str.strip() else 16
                length = max(4, min(length, 128))
            except ValueError:
                length = 16
            print(f"Generated password: {generate_password(length)}")
        elif choice == '4':
            if has_totp(TOTP_FILE):
                totp_data = load_totp_data(vault_key, TOTP_FILE)
                remaining = len(totp_data.get("backup_codes", [])) if totp_data else 0
                print(f"\n2FA is currently ENABLED. ({remaining} backup codes remaining)")
                print("1. Disable 2FA")
                print("2. Regenerate backup codes")
                print("3. Back")
                sub = timed_input("Select (1-3): ")
                if sub == '1':
                    code = input("Enter current 2FA code to confirm: ").strip()
                    if totp_data and pyotp.TOTP(totp_data["secret"]).verify(code, valid_window=1):
                        delete_totp_secret(TOTP_FILE)
                        print("2FA has been disabled.")
                    else:
                        print("Invalid code. 2FA remains enabled.")
                elif sub == '2':
                    code = input("Enter current 2FA code to confirm: ").strip()
                    if totp_data and pyotp.TOTP(totp_data["secret"]).verify(code, valid_window=1):
                        new_codes = generate_backup_codes()
                        totp_data["backup_codes"] = new_codes
                        save_totp_data(vault_key, salt, totp_data, TOTP_FILE)
                        print("\nNew backup codes:")
                        for i, c in enumerate(new_codes, 1):
                            print(f"  {i:2d}. {c}")
                        print("\nSave these codes in a safe place!")
                    else:
                        print("Invalid code.")
            else:
                print("\n2FA is currently DISABLED.")
                print("1. Enable 2FA")
                print("2. Back")
                sub = timed_input("Select (1-2): ")
                if sub == '1':
                    secret = pyotp.random_base32()
                    uri = pyotp.TOTP(secret).provisioning_uri(
                        name="vault", issuer_name="PasswordVault"
                    )
                    print(f"\nYour 2FA secret key: {secret}")
                    print(f"Provisioning URI: {uri}")
                    try:
                        import qrcode
                        qr = qrcode.QRCode(border=1)
                        qr.add_data(uri)
                        qr.print_ascii(invert=True)
                    except ImportError:
                        pass
                    print("\nScan the QR code or enter the secret in your authenticator app.")
                    code = input("Enter the 6-digit code to verify: ").strip()
                    if pyotp.TOTP(secret).verify(code, valid_window=1):
                        backup_codes = generate_backup_codes()
                        save_totp_data(vault_key, salt, {
                            "secret": secret,
                            "backup_codes": backup_codes,
                        }, TOTP_FILE)
                        print("2FA has been enabled!")
                        print("\nBackup codes:")
                        for i, c in enumerate(backup_codes, 1):
                            print(f"  {i:2d}. {c}")
                        print("\nSave these codes in a safe place!")
                    else:
                        print("Invalid code. 2FA was NOT enabled.")
        elif choice == '5':
            print("Goodbye.")
            break
        else:
            print("Invalid input")

if __name__ == "__main__":
    run()