from flask import Blueprint, request, jsonify, session
from backend.vault import generate_password

util_bp = Blueprint("util", __name__)

@util_bp.route("/generate", methods=["GET"])
def generate():
    if not session.get("authenticated"):
        return jsonify({"error": "Not authenticated"}), 401
    length = request.args.get("length", 16, type=int)
    length = max(4, min(length, 128))
    include_special = request.args.get("special", "true").lower() != "false"
    return jsonify({"password": generate_password(length, include_special=include_special)})

@util_bp.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})