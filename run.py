import os
import sys
import getpass
import platform
import subprocess
import threading
import time

from backend.vault import (
    generate_key,
    generate_password,
    load_passwords,
    save_passwords_with_key,
    check_lockout as _check_lockout,
    record_failed_attempt as _record_failed_attempt,
    clear_lockout,
    normalize_entries,
    SALT_SIZE,
)

VAULT_FILE = "vault.enc"
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

    fernet_key = None
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

        salt, passwords = load_passwords(master_pwd, VAULT_FILE)
        if passwords is None:
            print("Invalid Password")
            if record_failed_attempt():
                sys.exit(1)
            continue
        fernet_key = generate_key(master_pwd, salt)
        break
    else:
        print("Too many failed attempts.")
        sys.exit(1)

    clear_lockout(LOCKOUT_FILE)
    print("Vault opened!")

    while True:
        print("What do you want to do?")
        print("1. Add a new Password")
        print("2. Get an existing Password")
        print("3. Generate a secure Password")
        print("4. Exit")

        choice = timed_input("Select an option (1-4): ")

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

            save_passwords_with_key(fernet_key, salt, passwords, VAULT_FILE)
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
            print("Goodbye.")
            break
        else:
            print("Invalid input")

if __name__ == "__main__":
    run()