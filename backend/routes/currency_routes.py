from flask import Blueprint, request, jsonify
from datetime import datetime
from config import db
from models import User
from utils.auth import token_required
from utils.currency_service import (
    SUPPORTED_CURRENCIES,
    get_supported_currency_codes,
    get_cached_exchange_rates,
    update_manual_exchange_rates,
    convert_amount
)

currency_bp = Blueprint("currency_bp", __name__)


@currency_bp.route("/rates", methods=["GET"])
@currency_bp.route("/api/rates", methods=["GET"])
def get_rates():
    """
    Returns live or cached exchange rates relative to INR.
    """
    rates_to_inr, last_updated, source, is_cached = get_cached_exchange_rates()
    return jsonify({
        "base": "INR",
        "rates": rates_to_inr,
        "rates_to_inr": rates_to_inr,
        "last_updated": last_updated.isoformat() if last_updated else None,
        "source": source,
        "is_cached": is_cached
    })


@currency_bp.route("/currencies", methods=["GET"])
@token_required
def get_currencies(current_user_id):
    """
    Returns supported currencies, user's current base currency,
    active exchange rates (cached for 24 hours), and cache metadata.
    """
    user = User.query.get(current_user_id)
    base_currency = (user.base_currency if user and user.base_currency else "INR").upper()

    rates_to_inr, last_updated, source, is_cached = get_cached_exchange_rates()

    # Calculate exchange rates relative to user's base currency
    base_inr_rate = float(rates_to_inr.get(base_currency, 1.0))
    rates_relative_to_base = {}
    for code, inr_rate in rates_to_inr.items():
        # 1 unit of code in base_currency
        rates_relative_to_base[code] = round(float(inr_rate) / base_inr_rate, 4)

    return jsonify({
        "supported_currencies": SUPPORTED_CURRENCIES,
        "base_currency": base_currency,
        "rates_to_inr": rates_to_inr,
        "rates_to_base": rates_relative_to_base,
        "last_updated": last_updated.isoformat() if last_updated else None,
        "source": source,
        "is_cached": is_cached
    })


@currency_bp.route("/currencies/base", methods=["PUT"])
@token_required
def set_base_currency(current_user_id):
    """
    Updates the authenticated user's preferred base currency.
    """
    data = request.get_json() or {}
    new_currency = str(data.get("base_currency", "")).upper().strip()

    supported = get_supported_currency_codes()
    if new_currency not in supported:
        return jsonify({
            "error": f"Invalid currency code '{new_currency}'. Supported currencies: {', '.join(supported)}"
        }), 400

    user = User.query.get(current_user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    user.base_currency = new_currency
    db.session.commit()

    return jsonify({
        "message": f"Base currency updated to {new_currency}",
        "base_currency": new_currency,
        "user": user.to_dict()
    })


@currency_bp.route("/currencies/rates", methods=["POST"])
@token_required
def update_rates(current_user_id):
    """
    Allows user/admin to manually override exchange rates.
    Expected payload: { "rates": { "USD": 86.5, "EUR": 93.0, "GBP": 110.5 } }
    (rates relative to INR: 1 foreign unit = X INR)
    """
    data = request.get_json() or {}
    custom_rates = data.get("rates")

    if not isinstance(custom_rates, dict):
        return jsonify({"error": "Payload must contain a 'rates' object."}), 400

    rates, last_updated, source = update_manual_exchange_rates(custom_rates)

    user = User.query.get(current_user_id)
    base_currency = (user.base_currency if user and user.base_currency else "INR").upper()
    base_inr_rate = float(rates.get(base_currency, 1.0))

    rates_relative_to_base = {
        code: round(float(inr_rate) / base_inr_rate, 4)
        for code, inr_rate in rates.items()
    }

    return jsonify({
        "message": "Exchange rates updated successfully",
        "rates_to_inr": rates,
        "rates_to_base": rates_relative_to_base,
        "last_updated": last_updated.isoformat(),
        "source": source
    })


@currency_bp.route("/currencies/refresh", methods=["POST"])
@token_required
def refresh_rates(current_user_id):
    """
    Forces an immediate live refresh of exchange rates.
    """
    rates, last_updated, source, _ = get_cached_exchange_rates(force_refresh=True)

    user = User.query.get(current_user_id)
    base_currency = (user.base_currency if user and user.base_currency else "INR").upper()
    base_inr_rate = float(rates.get(base_currency, 1.0))

    rates_relative_to_base = {
        code: round(float(inr_rate) / base_inr_rate, 4)
        for code, inr_rate in rates.items()
    }

    return jsonify({
        "message": "Exchange rates refreshed",
        "rates_to_inr": rates,
        "rates_to_base": rates_relative_to_base,
        "last_updated": last_updated.isoformat() if last_updated else None,
        "source": source
    })
