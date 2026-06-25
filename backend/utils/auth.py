import jwt
import os
from functools import wraps
from flask import request, jsonify


def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None

        auth_header = request.headers.get("Authorization")

        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]

        if not token:
            return jsonify({"message": "Token is missing"}), 401

        try:
            data = jwt.decode(
                token,
                os.getenv("SECRET_KEY"),
                algorithms=["HS256"]
            )

            current_user_id = data["user_id"]

        except:
            return jsonify({"message": "Invalid token"}), 401

        return f(current_user_id, *args, **kwargs)

    return decorated