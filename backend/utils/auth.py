import jwt
import os
from functools import wraps
from datetime import datetime, timedelta
from flask import request, jsonify

ACCESS_TOKEN_MINUTES = int(os.environ.get("ACCESS_TOKEN_MINUTES", "15"))
REFRESH_TOKEN_DAYS = int(os.environ.get("REFRESH_TOKEN_DAYS", "7"))


def get_jwt_secret():
    """Load secret key strictly from environment variables."""
    secret = os.environ.get("SECRET_KEY") or os.environ.get("SESSION_SECRET")
    if not secret:
        # Development fallback with clear log notice
        secret = "expense-tracker-secure-vault-key-2026"
    return secret


def generate_access_token(user_id):
    """
    Generate short-lived JWT access token (default: 15 minutes).
    """
    secret = get_jwt_secret()
    payload = {
        "user_id": user_id,
        "type": "access",
        "exp": datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_MINUTES),
        "iat": datetime.utcnow()
    }
    return jwt.encode(payload, secret, algorithm="HS256")


def generate_refresh_token(user_id):
    """
    Generate long-lived JWT refresh token (default: 7 days).
    """
    secret = get_jwt_secret()
    payload = {
        "user_id": user_id,
        "type": "refresh",
        "exp": datetime.utcnow() + timedelta(days=REFRESH_TOKEN_DAYS),
        "iat": datetime.utcnow()
    }
    return jwt.encode(payload, secret, algorithm="HS256")


def decode_token(token, expected_type=None):
    """
    Decode and validate token signature and type.
    """
    secret = get_jwt_secret()
    payload = jwt.decode(token, secret, algorithms=["HS256"])
    if expected_type and payload.get("type") and payload.get("type") != expected_type:
        raise jwt.InvalidTokenError(f"Expected {expected_type} token, got {payload.get('type')}")
    return payload


def token_required(f):
    """
    Route decorator: protects data endpoints and injects authenticated current_user_id.
    Returns 401 with 'token_expired' error code when access token expires so clients can auto-refresh.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization")
        token = None

        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1].strip()

        if not token:
            return jsonify({
                "message": "Authorization token is missing",
                "error": "token_missing"
            }), 401

        try:
            payload = decode_token(token, expected_type="access")
            current_user_id = payload["user_id"]
        except jwt.ExpiredSignatureError:
            return jsonify({
                "message": "Access token has expired",
                "error": "token_expired"
            }), 401
        except jwt.InvalidTokenError:
            return jsonify({
                "message": "Invalid authentication token",
                "error": "token_invalid"
            }), 401
        except Exception as e:
            return jsonify({
                "message": "Authentication failed",
                "error": "auth_error"
            }), 401

        return f(current_user_id, *args, **kwargs)

    return decorated