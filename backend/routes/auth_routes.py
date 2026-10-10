import re
import os
import bcrypt
import jwt
from flask import Blueprint, request, jsonify, make_response
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError
from config import db
from models import User
from utils.auth import (
    generate_access_token,
    generate_refresh_token,
    decode_token,
    token_required
)
from utils.rate_limiter import login_limiter
from utils.migration import seed_categories_for_user

auth_bp = Blueprint("auth", __name__)

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")


def validate_password_strength(password):
    """
    Validate password has at least 8 characters and contains both letters and numbers.
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters long."
    if not any(c.isalpha() for c in password):
        return False, "Password must contain at least one letter."
    if not any(c.isdigit() for c in password):
        return False, "Password must contain at least one number."
    return True, None


def get_client_ip():
    """Retrieve client IP address considering proxy headers."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.remote_addr or "127.0.0.1"


# ─────────────────────────────────────────────────────────────
# REGISTER
# ─────────────────────────────────────────────────────────────
@auth_bp.route("/register", methods=["POST"])
@auth_bp.route("/api/register", methods=["POST"])
def register():
    data = request.get_json() or {}

    username = (data.get("username") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not username:
        return jsonify({"message": "Username is required"}), 400

    if len(username) < 3 or len(username) > 50:
        return jsonify({"message": "Username must be between 3 and 50 characters"}), 400

    if not email:
        return jsonify({"message": "Email address is required"}), 400

    if not EMAIL_REGEX.match(email):
        return jsonify({"message": "Please enter a valid email address format"}), 400

    if not password:
        return jsonify({"message": "Password is required"}), 400

    is_strong, strength_err = validate_password_strength(password)
    if not is_strong:
        return jsonify({"message": strength_err}), 400

    # Check for existing email or username (case-insensitive)
    existing_user = User.query.filter(
        or_(
            User.email.ilike(email),
            User.username.ilike(username)
        )
    ).first()

    if existing_user:
        return jsonify({"message": "An account with this email or username already exists"}), 400

    try:
        hashed_password = bcrypt.hashpw(
            password.encode("utf-8"),
            bcrypt.gensalt()
        ).decode("utf-8")

        user = User(
            username=username,
            email=email,
            password=hashed_password
        )

        db.session.add(user)
        db.session.commit()

        # Seed initial baseline categories for the new user
        seed_categories_for_user(user.id)

        # Issue access & refresh tokens
        access_token = generate_access_token(user.id)
        refresh_token = generate_refresh_token(user.id)

        response = make_response(jsonify({
            "message": "User registered successfully",
            "token": access_token,
            "username": user.username,
            "user": user.to_dict()
        }), 201)

        is_production = os.environ.get("FLASK_ENV") == "production" or os.environ.get("ENV") == "production"
        response.set_cookie(
            "refresh_token",
            refresh_token,
            httponly=True,
            samesite="Lax",
            secure=is_production,
            max_age=7 * 24 * 3600,
            path="/"
        )
        return response

    except IntegrityError:
        db.session.rollback()
        return jsonify({
            "message": "An account with this email or username already exists"
        }), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({
            "message": f"Registration failed: {str(e)}"
        }), 500


# ─────────────────────────────────────────────────────────────
# LOGIN
# ─────────────────────────────────────────────────────────────
@auth_bp.route("/login", methods=["POST"])
@auth_bp.route("/api/login", methods=["POST"])
def login():
    client_ip = get_client_ip()
    data = request.get_json() or {}

    identifier = (data.get("email") or data.get("username") or "").strip()
    password = data.get("password") or ""

    if not identifier or not password:
        return jsonify({"message": "Email/username and password are required"}), 400

    # Rate limit check: max 5 failed attempts in 15 minutes
    if login_limiter.is_rate_limited(client_ip, identifier):
        retry_after = login_limiter.get_retry_after(client_ip, identifier)
        minutes = max(1, retry_after // 60)
        return jsonify({
            "message": f"Too many failed login attempts. Please try again in {minutes} minute{'s' if minutes != 1 else ''}.",
            "error": "rate_limited",
            "retry_after_seconds": retry_after
        }), 429

    # Look up user by email or username (case-insensitive)
    user = User.query.filter(
        or_(
            User.email.ilike(identifier),
            User.username.ilike(identifier)
        )
    ).first()

    is_valid = False
    if user:
        try:
            is_valid = bcrypt.checkpw(
                password.encode("utf-8"),
                user.password.encode("utf-8")
            )
        except Exception:
            is_valid = False

    if not user or not is_valid:
        # Record failure for rate limiting
        login_limiter.record_failure(client_ip, identifier)
        # Generic error message to prevent account enumeration
        return jsonify({"message": "Invalid email/username or password"}), 401

    # Login successful: reset failed attempt counter
    login_limiter.reset(client_ip, identifier)

    access_token = generate_access_token(user.id)
    refresh_token = generate_refresh_token(user.id)

    response = make_response(jsonify({
        "message": "Login successful",
        "token": access_token,
        "username": user.username,
        "user": user.to_dict()
    }), 200)

    is_production = os.environ.get("FLASK_ENV") == "production" or os.environ.get("ENV") == "production"
    response.set_cookie(
        "refresh_token",
        refresh_token,
        httponly=True,
        samesite="Lax",
        secure=is_production,
        max_age=7 * 24 * 3600,
        path="/"
    )
    return response


# ─────────────────────────────────────────────────────────────
# REFRESH TOKEN
# ─────────────────────────────────────────────────────────────
@auth_bp.route("/refresh", methods=["POST"])
@auth_bp.route("/api/refresh", methods=["POST"])
def refresh():
    # Extract refresh token from httpOnly cookie, JSON body, or Authorization header
    token = request.cookies.get("refresh_token")
    if not token:
        data = request.get_json(silent=True) or {}
        token = data.get("refresh_token")
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1].strip()

    if not token:
        return jsonify({
            "message": "Refresh token is missing",
            "error": "token_missing"
        }), 401

    try:
        payload = decode_token(token, expected_type="refresh")
        user_id = payload["user_id"]
    except jwt.ExpiredSignatureError:
        return jsonify({
            "message": "Refresh token has expired. Please log in again.",
            "error": "refresh_expired"
        }), 401
    except Exception:
        return jsonify({
            "message": "Invalid refresh token",
            "error": "token_invalid"
        }), 401

    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"message": "User account no longer exists"}), 401

    new_access_token = generate_access_token(user.id)
    new_refresh_token = generate_refresh_token(user.id)

    response = make_response(jsonify({
        "message": "Token refreshed successfully",
        "token": new_access_token,
        "username": user.username,
        "user": user.to_dict()
    }), 200)

    is_production = os.environ.get("FLASK_ENV") == "production" or os.environ.get("ENV") == "production"
    response.set_cookie(
        "refresh_token",
        new_refresh_token,
        httponly=True,
        samesite="Lax",
        secure=is_production,
        max_age=7 * 24 * 3600,
        path="/"
    )
    return response


# ─────────────────────────────────────────────────────────────
# LOGOUT
# ─────────────────────────────────────────────────────────────
@auth_bp.route("/logout", methods=["POST"])
@auth_bp.route("/api/logout", methods=["POST"])
def logout():
    response = make_response(jsonify({
        "message": "Logged out successfully"
    }), 200)
    response.delete_cookie("refresh_token", path="/")
    return response


# ─────────────────────────────────────────────────────────────
# CURRENT USER PROFILE (/me)
# ─────────────────────────────────────────────────────────────
@auth_bp.route("/me", methods=["GET"])
@auth_bp.route("/api/me", methods=["GET"])
@token_required
def get_current_user_profile(current_user_id):
    user = db.session.get(User, current_user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify({
        "user": user.to_dict()
    })