import hashlib
import logging
import time
import requests
from flask import Blueprint, jsonify
from backend.routes.vault_routes import require_auth, get_vault_data
from backend.vault import normalize_entries

logger = logging.getLogger(__name__)

breach_bp = Blueprint("breach", __name__)

HIBP_API_URL = "https://api.pwnedpasswords.com/range/"
REQUEST_DELAY = 0.1

@breach_bp.route("/check", methods=["POST"])
@require_auth
def check_breaches():
    _, _, passwords = get_vault_data()
    if passwords is None:
        return jsonify({"error": "Failed to decrypt vault. Please log in again."}), 500

    results = {}
    total_checked = 0
    total_breached = 0
    errors = 0

    for website, entries in passwords.items():
        if website == "_folders_meta":
            continue
        for idx, entry in enumerate(normalize_entries(entries)):
            pwd = entry.get("password", "")
            if not pwd:
                continue

            key = f"{website}:{idx}"
            sha1 = hashlib.sha1(pwd.encode("utf-8")).hexdigest().upper()
            prefix = sha1[:5]
            suffix = sha1[5:]

            try:
                resp = requests.get(
                    f"{HIBP_API_URL}{prefix}",
                    headers={
                        "Add-Padding": "true",
                        "User-Agent": "PasswordManager-BreachCheck/1.0",
                    },
                    timeout=10,
                )
                resp.raise_for_status()

                count = 0
                for line in resp.text.splitlines():
                    parts = line.strip().split(":")
                    if len(parts) == 2 and parts[0] == suffix:
                        count = int(parts[1])
                        break

                results[key] = count
                total_checked += 1
                if count > 0:
                    total_breached += 1

            except Exception:
                logger.warning("HIBP check failed for %s", key, exc_info=True)
                results[key] = -1
                total_checked += 1
                errors += 1

            time.sleep(REQUEST_DELAY)

    return jsonify({
        "results": results,
        "total_checked": total_checked,
        "total_breached": total_breached,
        "errors": errors,
    })