import os
import base64
import json
import string
import secrets
import getpass
import subprocess
import threading
import time
from cryptography.fernet import Fernet, InvalidToken
from argon2.low_level import hash_secret_raw, Type

VAULT_FILE = "vault.enc"
LOCKOUT_FILE = ".vault.lock"
SALT_SIZE = 16
CLIPBOARD_CLEAR_SECONDS = 10
MAX_LOGIN_ATTEMPTS = 3
MIN_MASTER_PWD_LENGTH = 8
INACTIVITY_TIMEOUT = 300

ARGON2_TIME_COST = 3
ARGON2_MEMORY_COST = 65536
ARGON2_PARALLELISM = 4

_clipboard_timer = None

def generate_key(master_pwd, salt):
    key = hash_secret_raw(
        secret=master_pwd.encode(),
        salt=salt,
        time_cost=ARGON2_TIME_COST,
        memory_cost=ARGON2_MEMORY_COST,
        parallelism=ARGON2_PARALLELISM,
        hash_len=32,
        type=Type.ID,
    )
    return base64.urlsafe_b64encode(key)

def check_lockout():
    if not os.path.exists(LOCKOUT_FILE):
        return
    with open(LOCKOUT_FILE, "r") as f:
        data = json.load(f)
    locked_until = data.get("locked_until", 0)
    if time.time() < locked_until:
        remaining = int(locked_until - time.time())
        print(f"Vault is locked. Try again in {remaining} seconds.")
        exit()
    os.remove(LOCKOUT_FILE)

def record_failed_attempt():
    attempts = 0
    if os.path.exists(LOCKOUT_FILE):
        with open(LOCKOUT_FILE, "r") as f:
            data = json.load(f)
        attempts = data.get("attempts", 0)
    attempts += 1
    lockout_data = {"attempts": attempts, "locked_until": 0}
    if attempts >= MAX_LOGIN_ATTEMPTS:
        lockout_data["locked_until"] = time.time() + 60 * attempts
        print(f"Too many failed attempts. Locked for {attempts} minutes.")
    with open(LOCKOUT_FILE, "w") as f:
        json.dump(lockout_data, f)
    return attempts >= MAX_LOGIN_ATTEMPTS

def clear_lockout():
    if os.path.exists(LOCKOUT_FILE):
        os.remove(LOCKOUT_FILE)

def load_passwords(master_pwd):
    if not os.path.exists(VAULT_FILE):
        return os.urandom(SALT_SIZE), {}

    with open(VAULT_FILE, "rb") as file:
        salt = file.read(SALT_SIZE)
        encrypted_data = file.read()

    key = generate_key(master_pwd, salt)
    fernet = Fernet(key)
    try:
        decrypted_data = fernet.decrypt(encrypted_data)
        return salt, json.loads(decrypted_data.decode())
    except InvalidToken:
        return None, None

def save_passwords(master_pwd, salt, passwords_dict):
    key = generate_key(master_pwd, salt)
    fernet = Fernet(key)
    json_data = json.dumps(passwords_dict).encode()
    encrypted_data = fernet.encrypt(json_data)

    with open(VAULT_FILE, "wb") as file:
        file.write(salt)
        file.write(encrypted_data)

def copy_to_clipboard(text):
    global _clipboard_timer
    if _clipboard_timer is not None:
        _clipboard_timer.cancel()
    subprocess.run(["clip"], input=text.encode(), check=True)
    print("Copied to clipboard!")
    def clear():
        subprocess.run(["clip"], input=b"", check=True)
        print(f"\nClipboard cleared.")
    _clipboard_timer = threading.Timer(CLIPBOARD_CLEAR_SECONDS, clear)
    _clipboard_timer.start()

def generate_password(length=16):
    alphabet = string.ascii_letters + string.digits + "!@#$%&*?=-_+"
    return ''.join(secrets.choice(alphabet) for i in range(length))

def timed_input(prompt):
    start = time.time()
    result = input(prompt)
    if time.time() - start > INACTIVITY_TIMEOUT:
        print("\nSession timed out due to inactivity.")
        exit()
    return result

def run():
    print("This is a Passwort Vault.")

    check_lockout()
    is_new_vault = not os.path.exists(VAULT_FILE)

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

        salt, passwords = load_passwords(master_pwd)
        if passwords is None:
            print("Invalid Password")
            if record_failed_attempt():
                exit()
            continue
        break
    else:
        print("Too many failed attempts.")
        exit()

    clear_lockout()
    print("Vault opened!")

    while True:
        print("What do you want to do?")
        print("1. Add a new Password")
        print("2. Get a existing Password")
        print("3. Generate a secure Password")
        print("4. Exit")

        choice = timed_input("Select a option (1-4): ")

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

            passwords[website].append({
                "username": username,
                "password": password
            })

            save_passwords(master_pwd, salt, passwords)
            print(f"Password saved for {website}!")
        elif choice == '2':
            website = timed_input("Website/App: ").lower()
            if website in passwords:
                entries = passwords[website]
                if isinstance(entries, dict):
                    entries = [entries]
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
                    idx = int(pick) - 1 if pick.isdigit() and 1 <= int(pick) <= len(entries) else 0
                copy_to_clipboard(entries[idx]['password'])
                print(f"(Auto-clears in {CLIPBOARD_CLEAR_SECONDS}s)")
            else:
                print("No saved passwords found!")
        elif choice == '3':
            length = timed_input("Length of the generated password: ")
            length = int(length) if length.isdigit() else 16
            print(f"Generated password: {generate_password(length)}")
        elif choice == '4':
            print("shutdown")
            break
        else:
            print("Invalid input")

if __name__ == "__main__":
    run()