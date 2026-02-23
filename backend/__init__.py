import os
import stat
import time
import logging
import secrets
from flask import Flask, send_from_directory, session, jsonify, request
from flask_session import Session

logger = logging.getLogger(__name__)

DIST_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "dist")

ALLOWED_STATIC_EXT = {
    ".html", ".js", ".css", ".png", ".jpg", ".jpeg", ".svg",
    ".ico", ".woff", ".woff2", ".ttf", ".json", ".map",
}

def create_app():
    app = Flask(__name__, static_folder=None)
    app.config.from_object("backend.config.Config")
    Session(app)

    session_dir = app.config["SESSION_FILE_DIR"]
    os.makedirs(session_dir, exist_ok=True)
    try:
        os.chmod(session_dir, stat.S_IRWXU)
    except OSError:
        logger.warning("Could not set restrictive permissions on session directory: %s", session_dir)

    @app.before_request
    def check_session_timeout():
        if session.get("authenticated") or session.get("pending_2fa"):
            last_active = session.get("last_active", 0)
            if time.time() - last_active > app.config["INACTIVITY_TIMEOUT"]:
                session.clear()
                return jsonify({"error": "Session timed out"}), 401
            session["last_active"] = time.time()

    @app.before_request
    def csrf_protect():
        if request.method in ("POST", "PUT", "DELETE"):
            if request.path.startswith("/api/"):
                exempt = ("/api/auth/login", "/api/auth/create")
                if request.path not in exempt:
                    token = request.headers.get("X-CSRF-Token")
                    if not token or token != session.get("csrf_token"):
                        return jsonify({"error": "CSRF validation failed"}), 403

    @app.after_request
    def set_security_headers(response):
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self'; "
            "style-src 'self' 'unsafe-inline'; "
            "style-src-elem 'self' 'unsafe-inline'; "
            "font-src 'self' data:; "
            "img-src 'self' data:; "
            "connect-src 'self'; "
            "object-src 'none'; "
            "base-uri 'self'; "
            "frame-ancestors 'none'; "
            "form-action 'self'"
        )
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        response.headers["Cross-Origin-Opener-Policy"] = "same-origin"
        response.headers["Cross-Origin-Resource-Policy"] = "same-origin"
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, private"
        response.headers["Pragma"] = "no-cache"
        if "csrf_token" not in session:
            session["csrf_token"] = secrets.token_hex(32)
        response.headers["X-CSRF-Token"] = session.get("csrf_token", "")
        return response

    from backend.routes.auth_routes import auth_bp
    from backend.routes.vault_routes import vault_bp
    from backend.routes.util_routes import util_bp
    from backend.routes.totp_routes import totp_bp
    from backend.routes.folder_routes import folder_bp
    from backend.routes.export_routes import export_bp
    from backend.routes.import_routes import import_bp
    from backend.routes.note_routes import note_bp
    from backend.routes.file_routes import file_bp
    from backend.routes.breach_routes import breach_bp
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(export_bp, url_prefix="/api/passwords/export")
    app.register_blueprint(import_bp, url_prefix="/api/passwords/import")
    app.register_blueprint(note_bp, url_prefix="/api/notes")
    app.register_blueprint(file_bp, url_prefix="/api/files")
    app.register_blueprint(vault_bp, url_prefix="/api/passwords")
    app.register_blueprint(folder_bp, url_prefix="/api/folders")
    app.register_blueprint(util_bp, url_prefix="/api")
    app.register_blueprint(totp_bp, url_prefix="/api/auth/2fa")
    app.register_blueprint(breach_bp, url_prefix="/api/breach")

    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def serve_spa(path):
        if path:
            ext = os.path.splitext(path)[1].lower()
            if ext in ALLOWED_STATIC_EXT:
                full_path = os.path.realpath(os.path.join(DIST_DIR, path))
                real_dist = os.path.realpath(DIST_DIR)
                if full_path.startswith(real_dist + os.sep) and os.path.isfile(full_path):
                    return send_from_directory(DIST_DIR, path)
        return send_from_directory(DIST_DIR, "index.html")

    return app