import csv
import io
import json
import logging
from flask import Blueprint, request, jsonify, make_response
from backend.routes.vault_routes import require_auth, get_vault_data
from backend.vault import normalize_entries, encrypt_export

logger = logging.getLogger(__name__)

export_bp = Blueprint("export", __name__)

MAX_EXPORT_FOLDERS = 50

@export_bp.route("/", methods=["POST"])
@require_auth
def export_passwords():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    fmt = data.get("format", "json")
    if fmt not in ("json", "csv", "encrypted"):
        return jsonify({"error": "Format must be 'json', 'csv', or 'encrypted'"}), 400

    if fmt == "encrypted":
        export_password = data.get("export_password", "")
        if not isinstance(export_password, str) or len(export_password) < 8:
            return jsonify({"error": "Export password must be at least 8 characters"}), 400

    folders = data.get("folders")
    if folders is not None:
        if not isinstance(folders, list):
            return jsonify({"error": "Folders must be a list"}), 400
        if len(folders) > MAX_EXPORT_FOLDERS:
            return jsonify({"error": "Too many folders specified"}), 400
        for f in folders:
            if not isinstance(f, str):
                return jsonify({"error": "Each folder must be a string"}), 400

    include_unfiled = data.get("include_unfiled", True)

    _, _, passwords = get_vault_data()
    if passwords is None:
        return jsonify({"error": "Failed to decrypt vault. Please log in again."}), 500

    rows = []
    for website, entries in passwords.items():
        if website in ("_folders_meta", "_notes"):
            continue
        for entry in normalize_entries(entries):
            entry_folder = entry.get("folder") or None
            if folders is not None:
                if entry_folder and entry_folder in folders:
                    pass
                elif entry_folder is None and include_unfiled:
                    pass
                else:
                    continue
            row = {
                "type": "password",
                "website": website,
                "username": entry.get("username", ""),
                "password": entry.get("password", ""),
                "folder": entry_folder or "",
            }
            if entry.get("notes"):
                row["notes"] = entry["notes"]
            if entry.get("recovery_questions"):
                row["recovery_questions"] = entry["recovery_questions"]
            rows.append(row)

    notes_data = passwords.get("_notes", {})
    for note_title, note_entries in notes_data.items():
        for entry in normalize_entries(note_entries):
            entry_folder = entry.get("folder") or None
            if folders is not None:
                if entry_folder and entry_folder in folders:
                    pass
                elif entry_folder is None and include_unfiled:
                    pass
                else:
                    continue
            row = {
                "type": "note",
                "title": note_title,
                "content": entry.get("content", ""),
                "folder": entry_folder or "",
            }
            if entry.get("recovery_questions"):
                row["recovery_questions"] = entry["recovery_questions"]
            rows.append(row)

    if fmt == "encrypted":
        json_bytes = json.dumps(rows).encode("utf-8")
        encrypted_blob = encrypt_export(export_password, json_bytes)
        response = make_response(encrypted_blob)
        response.headers["Content-Type"] = "application/octet-stream"
        response.headers["Content-Disposition"] = "attachment; filename=vault_export.enc"
        return response

    if fmt == "json":
        content = json.dumps(rows, indent=2)
        response = make_response(content)
        response.headers["Content-Type"] = "application/json"
        response.headers["Content-Disposition"] = "attachment; filename=vault_export.json"
        return response

    fieldnames = ["type", "website", "username", "password", "folder", "notes", "title", "content", "recovery_questions"]
    csv_rows = []
    for row in rows:
        csv_row = dict(row)
        if "recovery_questions" in csv_row:
            csv_row["recovery_questions"] = json.dumps(csv_row["recovery_questions"])
        csv_rows.append(csv_row)

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction="ignore")
    writer.writeheader()
    writer.writerows(csv_rows)
    content = output.getvalue()

    response = make_response(content)
    response.headers["Content-Type"] = "text/csv"
    response.headers["Content-Disposition"] = "attachment; filename=vault_export.csv"
    return response