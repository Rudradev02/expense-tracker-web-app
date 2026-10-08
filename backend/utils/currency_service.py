import json
import logging
from datetime import datetime, timedelta
import urllib.request
from config import db
from models import ExchangeRateSetting

logger = logging.getLogger(__name__)

SUPPORTED_CURRENCIES = [
    {
        "code": "INR",
        "symbol": "₹",
        "name": "Indian Rupee",
        "locale": "en-IN"
    },
    {
        "code": "USD",
        "symbol": "$",
        "name": "US Dollar",
        "locale": "en-US"
    },
    {
        "code": "EUR",
        "symbol": "€",
        "name": "Euro",
        "locale": "en-IE"
    },
    {
        "code": "GBP",
        "symbol": "£",
        "name": "British Pound",
        "locale": "en-GB"
    }
]

# Baseline exchange rates: 1 unit of Currency = X INR
DEFAULT_RATES_TO_INR = {
    "INR": 1.0,
    "USD": 86.50,
    "EUR": 93.00,
    "GBP": 110.50
}

CACHE_DURATION = timedelta(hours=24)


def get_supported_currency_codes():
    return [c["code"] for c in SUPPORTED_CURRENCIES]


def fetch_live_exchange_rates():
    """
    Attempts to fetch live exchange rates from public API.
    Returns normalized rates relative to INR: { 'INR': 1.0, 'USD': 86.5, ... }
    """
    try:
        url = "https://open.er-api.com/v6/latest/USD"
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "ExpenseTracker/1.0"}
        )
        with urllib.request.urlopen(req, timeout=4) as response:
            if response.status == 200:
                data = json.loads(response.read().decode("utf-8"))
                rates = data.get("rates", {})
                usd_inr = rates.get("INR")
                usd_eur = rates.get("EUR")
                usd_gbp = rates.get("GBP")

                if usd_inr and usd_eur and usd_gbp:
                    normalized = {
                        "INR": 1.0,
                        "USD": round(float(usd_inr), 4),
                        "EUR": round(float(usd_inr) / float(usd_eur), 4),
                        "GBP": round(float(usd_inr) / float(usd_gbp), 4),
                    }
                    return normalized
    except Exception as e:
        logger.warning(f"Could not fetch live rates from external API: {e}")

    return None


def get_cached_exchange_rates(force_refresh=False):
    """
    Retrieves current exchange rates.
    Checks DB cache (valid for 24 hours).
    If expired or missing and not manual lock, tries live fetch.
    Falls back gracefully to existing rates or baseline defaults.
    """
    setting = ExchangeRateSetting.query.first()
    now = datetime.utcnow()

    # If cache is valid and not force_refresh
    if setting and setting.rates_json and not force_refresh:
        age = now - (setting.last_updated or now)
        if age < CACHE_DURATION:
            try:
                rates = json.loads(setting.rates_json)
                if all(c in rates for c in ["INR", "USD", "EUR", "GBP"]):
                    return rates, setting.last_updated, setting.source, True
            except Exception:
                pass

    # Attempt fresh fetch
    live_rates = fetch_live_exchange_rates()
    if live_rates:
        if not setting:
            setting = ExchangeRateSetting(
                rates_json=json.dumps(live_rates),
                last_updated=now,
                source="api"
            )
            db.session.add(setting)
        else:
            setting.rates_json = json.dumps(live_rates)
            setting.last_updated = now
            setting.source = "api"
        try:
            db.session.commit()
            return live_rates, setting.last_updated, "api", False
        except Exception as e:
            db.session.rollback()
            logger.warning(f"Failed to commit updated exchange rates: {e}")

    # Fallback to existing record or baseline defaults
    if setting and setting.rates_json:
        try:
            rates = json.loads(setting.rates_json)
            return rates, setting.last_updated, setting.source, True
        except Exception:
            pass

    # Create baseline record if none exists
    baseline = dict(DEFAULT_RATES_TO_INR)
    if not setting:
        setting = ExchangeRateSetting(
            rates_json=json.dumps(baseline),
            last_updated=now,
            source="fallback"
        )
        db.session.add(setting)
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()

    return baseline, now, "fallback", False


def update_manual_exchange_rates(custom_rates):
    """
    Allows user to manually override exchange rates.
    custom_rates should be a dict like { "USD": 86.5, "EUR": 93.0, "GBP": 110.5 }
    Rates are normalized to 1 unit = X INR.
    """
    rates, _, _, _ = get_cached_exchange_rates()
    updated = dict(rates)

    for code, val in custom_rates.items():
        code = str(code).upper().strip()
        if code in get_supported_currency_codes():
            try:
                num = float(val)
                if num > 0:
                    updated[code] = round(num, 4)
            except (ValueError, TypeError):
                pass

    updated["INR"] = 1.0  # Anchor

    now = datetime.utcnow()
    setting = ExchangeRateSetting.query.first()
    if not setting:
        setting = ExchangeRateSetting(
            rates_json=json.dumps(updated),
            last_updated=now,
            source="manual"
        )
        db.session.add(setting)
    else:
        setting.rates_json = json.dumps(updated)
        setting.last_updated = now
        setting.source = "manual"

    db.session.commit()
    return updated, setting.last_updated, "manual"


def convert_amount(amount, from_currency, to_currency, rates_map=None):
    """
    Converts amount from from_currency to to_currency using rates_map.
    rates_map contains rates where 1 unit of Currency = X INR.
    Returns (converted_amount, exchange_rate)
    """
    if rates_map is None:
        rates_map, _, _, _ = get_cached_exchange_rates()

    from_c = (from_currency or "INR").upper().strip()
    to_c = (to_currency or "INR").upper().strip()

    if from_c == to_c:
        return round(float(amount), 2), 1.0

    rate_from_inr = float(rates_map.get(from_c, 1.0))
    rate_to_inr = float(rates_map.get(to_c, 1.0))

    if rate_to_inr <= 0:
        rate_to_inr = 1.0

    # 1 unit of from_currency = (rate_from_inr / rate_to_inr) units of to_currency
    rate = rate_from_inr / rate_to_inr
    converted = round(float(amount) * rate, 2)
    return converted, round(rate, 4)
