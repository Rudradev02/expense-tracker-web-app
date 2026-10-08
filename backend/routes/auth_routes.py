from flask import Blueprint, request, jsonify
from models import User
import jwt
import os
from datetime import datetime, timedelta
from config import db
import bcrypt
from sqlalchemy.exc import IntegrityError
from sqlalchemy import or_

auth_bp = Blueprint("auth", __name__)


# ─────────────────────────────────────────────────────────────
# REGISTER
# ─────────────────────────────────────────────────────────────
@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json() or {}

    username = (data.get("username") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not username:
        return jsonify({"message": "Username is required"}), 400

    if not email:
        return jsonify({"message": "Email address is required"}), 400

    if not password:
        return jsonify({"message": "Password is required"}), 400

    if len(password) < 6:
        return jsonify({"message": "Password must be at least 6 characters"}), 400

    # Check for existing email (case-insensitive)
    if User.query.filter(User.email.ilike(email)).first():
        return jsonify({"message": "An account with this email already exists"}), 400

    # Check for existing username (case-insensitive)
    if User.query.filter(User.username.ilike(username)).first():
        return jsonify({"message": f"Username '{username}' is already taken. Please choose another."}), 400

    try:
        hashed_password = bcrypt.hashpw(
            password.encode("utf-8"),
            bcrypt.gensalt()
        )

        user = User(
            username=username,
            email=email,
            password=hashed_password.decode("utf-8")
        )

        db.session.add(user)
        db.session.commit()

        return jsonify({
            "message": "User registered successfully",
            "username": user.username
        }), 201

    except IntegrityError as e:
        db.session.rollback()
        return jsonify({
            "message": "Registration failed: username or email is already taken."
        }), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({
            "message": "An unexpected error occurred during registration. Please try again."
        }), 500


# ─────────────────────────────────────────────────────────────
# LOGIN
# ─────────────────────────────────────────────────────────────
@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}

    identifier = (data.get("email") or data.get("username") or "").strip()
    password = data.get("password") or ""

    if not identifier or not password:
        return jsonify({"message": "Email/username and password are required"}), 400

    # Look up user by either email or username (case-insensitive)
    user = User.query.filter(
        or_(
            User.email.ilike(identifier),
            User.username.ilike(identifier)
        )
    ).first()

    if not user:
        return jsonify({"message": "Invalid email/username or password"}), 401

    try:
        is_valid = bcrypt.checkpw(
            password.encode("utf-8"),
            user.password.encode("utf-8")
        )
    except Exception:
        is_valid = False

    if not is_valid:
        return jsonify({"message": "Invalid email/username or password"}), 401

    secret = os.getenv("SECRET_KEY") or os.getenv("SESSION_SECRET", "dev-secret-change-me")
    token = jwt.encode(
        {
            "user_id": user.id,
            "exp": datetime.utcnow() + timedelta(days=7)
        },
        secret,
        algorithm="HS256"
    )

    return jsonify({
        "message": "Login successful",
        "token": token,
        "username": user.username
    })