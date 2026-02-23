import csv
import io
import json
import logging
from filelock import FileLock
from flask import Blueprint, request, jsonify
from backend.routes.vault_routes import (
    require_auth, get_session_material, save_vault, validate_website,
    validate_folder, validate_recovery_questions, count_existing_folders,
    MAX_USERNAME_LENGTH, MAX_PASSWORD_LENGTH, MAX_TOTAL_ENTRIES,
    MAX_ENTRIES_PER_SITE, MAX_FOLDERS, MAX_NOTES_PER_TITLE,
)
from backend.vault import load_passwords_with_key, normalize_entries, decrypt_export, VaultDecryptionError

logger = logging.getLogger(__name__)

import_bp = Blueprint("import", __name__)

MAX_IMPORT_FILE_SIZE = 5 * 1024 * 1024
MAX_IMPORT_ENTRIES = 5000
REQUIRED_CSV_FIELDS = {"website", "username", "password"}
ALLOWED_CSV_FIELDS = {"type", "website", "username", "password", "folder", "notes", "title", "content", "recovery_questions"}

def _parse_csv(text: str) -> tuple[list[dict], str | None]:
    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames:
        return [], "CSV file is empty or has no header row"
    fields = set(reader.fieldnames)
    # Require at least website or title column
    if "website" not in fields and "title" not in fields:
        return [], "CSV missing required column: website or title"
    rows = []
    for i, row in enumerate(reader, start=2):
        if i > MAX_IMPORT_ENTRIES + 1:
            return [], f"Too many entries (max {MAX_IMPORT_ENTRIES})"
        entry_type = (row.get("type") or "").strip().lower()
        if entry_type == "note":
            title = (row.get("title") or row.get("website") or "").strip()
            content_val = (row.get("content") or "").strip()
            rq_raw = (row.get("recovery_questions") or "").strip()
            rq = None
            if rq_raw:
                try:
                    rq = json.loads(rq_raw)
                except json.JSONDecodeError:
                    pass
            rows.append({
                "type": "note",
                "title": title,
                "content": content_val,
                "folder": (row.get("folder") or "").strip() or None,
                "recovery_questions": rq,
            })
        else:
            row_data = {
                "website": (row.get("website") or "").strip(),
                "username": (row.get("username") or "").strip(),
                "password": (row.get("password") or "").strip(),
                "folder": (row.get("folder") or "").strip() or None,
            }
            if row.get("notes"):
                row_data["notes"] = row["notes"].strip()
            rq_raw = (row.get("recovery_questions") or "").strip()
            if rq_raw:
                try:
                    row_data["recovery_questions"] = json.loads(rq_raw)
                except json.JSONDecodeError:
                    pass
            rows.append(row_data)
    return rows, None

def _parse_json(text: str) -> tuple[list[dict], str | None]:
    try:
        data = json.loads(text)
    except json.JSONDecodeError as e:
        return [], f"Invalid JSON: {e}"
    if not isinstance(data, list):
        return [], "JSON must be an array of entries"
    if len(data) > MAX_IMPORT_ENTRIES:
        return [], f"Too many entries (max {MAX_IMPORT_ENTRIES})"
    rows = []
    for i, item in enumerate(data):
        if not isinstance(item, dict):
            return [], f"Entry {i + 1} is not an object"
        entry_type = item.get("type", "")
        if entry_type == "note":
            if not item.get("title") and not item.get("website"):
                return [], f"Entry {i + 1} (note) missing title"
            if not item.get("content"):
                return [], f"Entry {i + 1} (note) missing content"
            rows.append({
                "type": "note",
                "title": str(item.get("title") or item.get("website", "")).strip(),
                "content": str(item["content"]).strip(),
                "folder": str(item["folder"]).strip() if item.get("folder") else None,
                "recovery_questions": item.get("recovery_questions"),
            })
        else:
            if not item.get("website") or not item.get("username"):
                return [], f"Entry {i + 1} missing website or username"
            row = {
                "website": str(item["website"]).strip(),
                "username": str(item["username"]).strip(),
                "password": str(item.get("password", "")).strip(),
                "folder": str(item["folder"]).strip() if item.get("folder") else None,
            }
            if item.get("notes"):
                row["notes"] = str(item["notes"]).strip()
            if item.get("recovery_questions"):
                row["recovery_questions"] = item["recovery_questions"]
            rows.append(row)
    return rows, None

def _validate_entry(entry: dict) -> str | None:
    if entry.get("type") == "note":
        title = entry.get("title", "").lower()
        if not validate_website(title):
            return f"Invalid note title: {entry.get('title', '')}"
        if not entry.get("content"):
            return f"Missing content for note: {entry.get('title', '')}"
        if len(entry["content"]) > 50000:
            return f"Content too long for note: {entry.get('title', '')}"
        folder_err = validate_folder(entry.get("folder"))
        if folder_err:
            return f"{folder_err} for note: {entry.get('title', '')}"
        if entry.get("recovery_questions"):
            rq_err = validate_recovery_questions(entry["recovery_questions"])
            if rq_err:
                return f"{rq_err} for note: {entry.get('title', '')}"
        return None
    # existing password validation
    website = entry["website"].lower()
    if not validate_website(website):
        return f"Invalid website: {entry['website']}"
    if not entry["username"] or len(entry["username"]) > MAX_USERNAME_LENGTH:
        return f"Invalid username for {entry['website']}"
    if not entry["password"]:
        return f"Missing password for {entry['website']}"
    if len(entry["password"]) > MAX_PASSWORD_LENGTH:
        return f"Password too long for {entry['website']}"
    folder_err = validate_folder(entry.get("folder"))
    if folder_err:
        return f"{folder_err} for {entry['website']}"
    if entry.get("recovery_questions"):
        rq_err = validate_recovery_questions(entry["recovery_questions"])
        if rq_err:
            return f"{rq_err} for {entry['website']}"
    return None

@import_bp.route("/", methods=["POST"])
@require_auth
def import_passwords():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]
    if not file.filename:
        return jsonify({"error": "No file selected"}), 400

    content = file.read()
    if len(content) > MAX_IMPORT_FILE_SIZE:
        return jsonify({"error": "File too large (max 5 MB)"}), 400

    filename = file.filename.lower()

    if filename.endswith(".enc"):
        password = request.form.get("password", "")
        if not password:
            return jsonify({"error": "Password is required for encrypted files"}), 400
        try:
            decrypted = decrypt_export(password, content)
            text = decrypted.decode("utf-8")
        except VaultDecryptionError as e:
            return jsonify({"error": str(e)}), 400
        except UnicodeDecodeError:
            return jsonify({"error": "Decrypted data is not valid text"}), 400
        rows, err = _parse_json(text)
    elif filename.endswith(".csv"):
        text = content.decode("utf-8", errors="replace")
        rows, err = _parse_csv(text)
    elif filename.endswith(".json"):
        text = content.decode("utf-8", errors="replace")
        rows, err = _parse_json(text)
    else:
        return jsonify({"error": "Unsupported file format. Use .json, .csv, or .enc"}), 400

    if err:
        return jsonify({"error": err}), 400
    if not rows:
        return jsonify({"error": "No entries found in file"}), 400

    errors = []
    for i, entry in enumerate(rows):
        validation_err = _validate_entry(entry)
        if validation_err:
            errors.append(f"Row {i + 1}: {validation_err}")
            if len(errors) >= 10:
                errors.append("... and more errors")
                break

    if errors:
        return jsonify({"error": "Validation errors", "details": errors}), 400

    try:
        key_raw, salt, vault_path = get_session_material()
    except Exception as e:
        logger.error("Failed to load vault session data: %s", e)
        return jsonify({"error": "Failed to decrypt vault. Please log in again."}), 500

    try:
        with FileLock(vault_path + ".lock"):
            passwords = load_passwords_with_key(key_raw, vault_path)

            total_entries = sum(
                len(v) if isinstance(v, list) else 1
                for k, v in passwords.items() if k not in ("_folders_meta", "_notes")
            )
            notes_data = passwords.get("_notes", {})
            if isinstance(notes_data, dict):
                total_entries += sum(
                    len(v) if isinstance(v, list) else 1
                    for v in notes_data.values()
                )

            imported = 0
            skipped = 0

            # Separate password entries and note entries
            password_rows = [r for r in rows if r.get("type") != "note"]
            note_rows = [r for r in rows if r.get("type") == "note"]

            for entry in password_rows:
                website = entry["website"].lower()
                username = entry["username"]
                password = entry["password"]
                folder = entry.get("folder")

                if total_entries + imported >= MAX_TOTAL_ENTRIES:
                    return jsonify({
                        "error": f"Vault limit reached. Imported {imported}, skipped rest.",
                        "imported": imported,
                        "skipped": skipped,
                    }), 400

                if website not in passwords:
                    passwords[website] = []
                passwords[website] = normalize_entries(passwords[website])

                if len(passwords[website]) >= MAX_ENTRIES_PER_SITE:
                    skipped += 1
                    continue

                is_duplicate = any(
                    e.get("username") == username and e.get("password") == password
                    for e in passwords[website]
                )
                if is_duplicate:
                    skipped += 1
                    continue

                if folder:
                    existing_folders = count_existing_folders(passwords)
                    if folder not in existing_folders and len(existing_folders) >= MAX_FOLDERS:
                        folder = None

                new_entry = {"username": username, "password": password}
                if folder:
                    new_entry["folder"] = folder
                if entry.get("notes"):
                    new_entry["notes"] = entry["notes"]
                if entry.get("recovery_questions"):
                    new_entry["recovery_questions"] = entry["recovery_questions"]
                passwords[website].append(new_entry)
                imported += 1

            # Merge notes
            for entry in note_rows:
                title = entry["title"].lower()

                if total_entries + imported >= MAX_TOTAL_ENTRIES:
                    return jsonify({
                        "error": f"Vault limit reached. Imported {imported}, skipped rest.",
                        "imported": imported,
                        "skipped": skipped,
                    }), 400

                if "_notes" not in passwords:
                    passwords["_notes"] = {}
                if title not in passwords["_notes"]:
                    passwords["_notes"][title] = []

                if len(passwords["_notes"][title]) >= MAX_NOTES_PER_TITLE:
                    skipped += 1
                    continue

                # Check duplicates
                is_duplicate = any(
                    e.get("content") == entry["content"]
                    for e in passwords["_notes"][title]
                )
                if is_duplicate:
                    skipped += 1
                    continue

                folder = entry.get("folder")
                if folder:
                    existing_folders = count_existing_folders(passwords)
                    if folder not in existing_folders and len(existing_folders) >= MAX_FOLDERS:
                        folder = None

                new_note = {"type": "note", "content": entry["content"]}
                if folder:
                    new_note["folder"] = folder
                if entry.get("recovery_questions"):
                    new_note["recovery_questions"] = entry["recovery_questions"]
                passwords["_notes"][title].append(new_note)
                imported += 1

            save_vault(key_raw, salt, vault_path, passwords)
    except Exception as e:
        logger.error("Failed to update vault data: %s", e)
        return jsonify({"error": "Failed to decrypt vault. Please log in again."}), 500

    return jsonify({"success": True, "imported": imported, "skipped": skipped})