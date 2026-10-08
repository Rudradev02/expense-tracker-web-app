from flask import Blueprint, jsonify, request
from datetime import datetime, date
import calendar
from config import db
from models import Transaction, RecurringRule
from utils.auth import token_required

forecast_bp = Blueprint("forecast_bp", __name__)


def calculate_next_month(ref_date=None):
    """Return next month's year and month numbers and formatted display strings."""
    if ref_date is None:
        ref_date = date.today()
    elif isinstance(ref_date, datetime):
        ref_date = ref_date.date()

    if ref_date.month == 12:
        target_year = ref_date.year + 1
        target_month = 1
    else:
        target_year = ref_date.year
        target_month = ref_date.month + 1

    first_day = date(target_year, target_month, 1)
    return {
        "year": target_year,
        "month": target_month,
        "first_day": first_day,
        "month_name": first_day.strftime("%B %Y"),
        "month_short": first_day.strftime("%b %Y"),
    }


def compute_recurring_commitments(current_user_id, target_year, target_month):
    """
    Calculate projected recurring expense commitments for the target month.
    Returns: (total_recurring, recurring_by_category)
    """
    target_start = date(target_year, target_month, 1)
    _, days_in_target_month = calendar.monthrange(target_year, target_month)
    target_end = date(target_year, target_month, days_in_target_month)

    rules = (
        RecurringRule.query
        .filter_by(user_id=current_user_id, active=True)
        .all()
    )

    recurring_by_category = {}

    for rule in rules:
        if (rule.type or "").strip().lower() != "expense":
            continue

        amt = float(rule.amount or 0)
        if amt <= 0:
            continue

        # Check validity window
        if rule.end_date and rule.end_date < target_start:
            continue
        if rule.start_date and rule.start_date > target_end:
            continue

        freq = (rule.frequency or "monthly").strip().lower()
        occurrences = 0.0

        if freq == "daily":
            occurrences = float(days_in_target_month)
        elif freq == "weekly":
            # Approximately 4.33 weeks in an average month (or 4 full cycles)
            occurrences = 4.33
        elif freq == "monthly":
            occurrences = 1.0
        elif freq == "yearly":
            # Count if the rule's next_run_date or start_date falls in the target month
            rule_month = None
            if rule.next_run_date:
                rule_month = rule.next_run_date.month
            elif rule.start_date:
                rule_month = rule.start_date.month

            if rule_month == target_month:
                occurrences = 1.0
        else:
            occurrences = 1.0

        rule_total = amt * occurrences
        cat = (rule.category or "General").strip().title()
        recurring_by_category[cat] = recurring_by_category.get(cat, 0.0) + rule_total

    total_recurring = sum(recurring_by_category.values())
    return total_recurring, recurring_by_category


@forecast_bp.route("/forecast", methods=["GET"])
@token_required
def get_forecast(current_user_id):
    today = date.today()
    next_month_info = calculate_next_month(today)
    target_year = next_month_info["year"]
    target_month = next_month_info["month"]
    target_month_name = next_month_info["month_name"]
    target_month_short = next_month_info["month_short"]

    # 1. Fetch all expense transactions for the user
    transactions = (
        Transaction.query
        .filter_by(user_id=current_user_id)
        .filter(Transaction.type.ilike("expense"))
        .order_by(Transaction.date.asc())
        .all()
    )

    # 2. Group expenses by (year, month)
    monthly_data = {}  # (year, month) -> {"total": float, "categories": {cat: float}}
    for t in transactions:
        if not t.date:
            continue
        amt = float(t.amount or 0)
        if amt <= 0:
            continue

        y, m = t.date.year, t.date.month
        cat = (t.category or "General").strip().title()

        if (y, m) not in monthly_data:
            monthly_data[(y, m)] = {"total": 0.0, "categories": {}}

        monthly_data[(y, m)] = monthly_data[(y, m)]
        monthly_data[(y, m)]["total"] += amt
        monthly_data[(y, m)]["categories"][cat] = (
            monthly_data[(y, m)]["categories"].get(cat, 0.0) + amt
        )

    distinct_months = sorted(list(monthly_data.keys()))
    months_count = len(distinct_months)

    # 3. Validation: Minimum 2 months required
    if months_count < 2:
        return jsonify({
            "has_enough_data": False,
            "message": "At least 2 months of expense data are required to generate a forecast.",
            "months_analyzed": months_count,
            "target_month": target_month_name,
            "target_month_short": target_month_short,
            "confidence_note": (
                f"Based on {months_count} month of data (need at least 2)"
                if months_count == 1
                else "No expense history recorded yet (need at least 2 months)"
            ),
            "projected_total": 0.0,
            "category_breakdown": [],
            "recurring_commitments_total": 0.0,
        }), 200

    # 4. Use the last 3 to 6 months chronologically
    # If user has 2 months, use 2. If 3..6, use all available up to 6.
    recent_months = distinct_months[-6:]
    k = len(recent_months)

    # Assign weights: w_i = i for i in 1..k (giving more weight to recent months)
    weights = list(range(1, k + 1))
    total_weight = sum(weights)

    # Prorate current month if included in recent_months and still ongoing
    prorated_monthly = []
    for (y, m) in recent_months:
        raw_total = monthly_data[(y, m)]["total"]
        raw_cats = dict(monthly_data[(y, m)]["categories"])

        if y == today.year and m == today.month:
            _, days_in_month = calendar.monthrange(y, m)
            days_elapsed = max(1, today.day)
            # Proration factor capped at 3.0 to prevent early-month distortion
            scale = min(3.0, float(days_in_month) / float(days_elapsed))
            prorated_cats = {cat: val * scale for cat, val in raw_cats.items()}
            prorated_total = raw_total * scale
        else:
            prorated_cats = raw_cats
            prorated_total = raw_total

        prorated_monthly.append({
            "year": y,
            "month": m,
            "total": prorated_total,
            "categories": prorated_cats
        })

    # Collect all unique categories across analyzed months
    all_categories = set()
    for month_entry in prorated_monthly:
        all_categories.update(month_entry["categories"].keys())

    # 5. Compute Weighted Moving Average (WMA) per category
    category_wma = {}
    for cat in all_categories:
        weighted_sum = 0.0
        for i, month_entry in enumerate(prorated_monthly):
            cat_val = month_entry["categories"].get(cat, 0.0)
            weighted_sum += weights[i] * cat_val
        category_wma[cat] = weighted_sum / total_weight

    # 6. Factor in active recurring transactions for next month
    total_recurring, recurring_by_category = compute_recurring_commitments(
        current_user_id, target_year, target_month
    )

    # Union all categories from WMA and recurring rules
    combined_categories = set(all_categories).union(recurring_by_category.keys())

    category_breakdown = []
    for cat in combined_categories:
        wma_amt = category_wma.get(cat, 0.0)
        rec_amt = recurring_by_category.get(cat, 0.0)

        # Baseline cannot be less than confirmed recurring commitments
        projected_amt = max(wma_amt, rec_amt)

        category_breakdown.append({
            "category": cat,
            "projected": round(projected_amt, 2),
            "historical_wma": round(wma_amt, 2),
            "recurring_amount": round(rec_amt, 2),
        })

    # Sort descending by projected amount
    category_breakdown.sort(key=lambda x: x["projected"], reverse=True)

    projected_total = round(sum(c["projected"] for c in category_breakdown), 2)

    # Compute percentage share per category
    for c in category_breakdown:
        c["percentage"] = (
            round((c["projected"] / projected_total) * 100, 1)
            if projected_total > 0
            else 0.0
        )

    # 7. Formulate confidence note and explanation
    confidence_note = f"Based on {k} months of data"
    if total_recurring > 0:
        confidence_note += " and active recurring commitments"

    explanation = (
        f"Calculated using a weighted moving average of your last {k} months of spending "
        f"(giving higher weight to recent months), combined with scheduled recurring commitments."
    )

    return jsonify({
        "has_enough_data": True,
        "target_month": target_month_name,
        "target_month_short": target_month_short,
        "projected_total": projected_total,
        "confidence_note": confidence_note,
        "months_analyzed": k,
        "category_breakdown": category_breakdown,
        "recurring_commitments_total": round(total_recurring, 2),
        "calculation_explanation": explanation,
    }), 200
