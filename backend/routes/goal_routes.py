from flask import Blueprint, request, jsonify
from datetime import datetime, date
from config import db
from models import Goal
from utils.auth import token_required

goal_bp = Blueprint("goal_bp", __name__)


def parse_date_string(date_val):
    """Parses various date string formats into datetime.date."""
    if not date_val:
        return None
    if isinstance(date_val, date) and not isinstance(date_val, datetime):
        return date_val
    if isinstance(date_val, datetime):
        return date_val.date()

    cleaned = str(date_val).strip()[:10]
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%Y/%m/%d", "%d/%m/%Y", "%m/%d/%Y"):
        try:
            return datetime.strptime(cleaned, fmt).date()
        except ValueError:
            continue
    return None


def enrich_goal(goal):
    """
    Computes real-time progress, days left, and required monthly savings velocity.
    """
    g_dict = goal.to_dict()
    today = date.today()
    target_date = goal.target_date

    target_amount = float(goal.target_amount or 0.0)
    saved_amount = float(goal.saved_amount or 0.0)
    remaining = max(0.0, round(target_amount - saved_amount, 2))
    percentage = round(min(100.0, (saved_amount / target_amount) * 100), 1) if target_amount > 0 else 0.0
    is_completed = saved_amount >= target_amount

    days_left = (target_date - today).days if target_date else 0

    # Calculate required monthly saving to hit target_date
    if is_completed:
        required_monthly = 0.0
        monthly_text = "Goal accomplished"
    elif days_left <= 0:
        required_monthly = remaining
        monthly_text = f"Save ₹{int(remaining):,} (past due)" if remaining > 0 else "Goal accomplished"
    else:
        # Average days per month is ~30.44
        months_left = max(days_left / 30.4375, 1.0)
        required_monthly = round(remaining / months_left, 2)
        # Format user-friendly string e.g. "Save ₹5,000/month"
        monthly_text = f"Save ₹{int(round(required_monthly)):,}/month"

    g_dict.update({
        "percentage": percentage,
        "remaining": remaining,
        "is_completed": is_completed,
        "days_left": days_left,
        "required_monthly_saving": required_monthly,
        "monthly_saving_text": monthly_text,
    })
    return g_dict


# ─────────────────────────────────────────────────────────────
# LIST ALL GOALS
# ─────────────────────────────────────────────────────────────
@goal_bp.route("/goals", methods=["GET"])
@goal_bp.route("/api/goals", methods=["GET"])
@token_required
def get_goals(current_user_id):
    goals = (
        Goal.query
        .filter_by(user_id=current_user_id)
        .order_by(Goal.target_date.asc())
        .all()
    )
    enriched = [enrich_goal(g) for g in goals]
    # Sort active goals first, then completed ones
    enriched.sort(key=lambda x: (1 if x["is_completed"] else 0, x["days_left"]))
    return jsonify(enriched), 200


# ─────────────────────────────────────────────────────────────
# CREATE GOAL
# ─────────────────────────────────────────────────────────────
@goal_bp.route("/goals", methods=["POST"])
@goal_bp.route("/api/goals", methods=["POST"])
@token_required
def create_goal(current_user_id):
    data = request.get_json() or {}

    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"error": "Goal name is required"}), 400
    if len(name) > 100:
        return jsonify({"error": "Goal name cannot exceed 100 characters"}), 400

    # Target amount validation
    try:
        target_amount = float(data.get("target_amount"))
        if target_amount <= 0:
            return jsonify({"error": "Target amount must be greater than zero"}), 400
    except (ValueError, TypeError):
        return jsonify({"error": "Valid target amount is required"}), 400

    # Optional initial saved amount
    saved_amount = 0.0
    if "saved_amount" in data and data.get("saved_amount") is not None:
        try:
            saved_amount = float(data.get("saved_amount"))
            if saved_amount < 0:
                return jsonify({"error": "Saved amount cannot be negative"}), 400
        except (ValueError, TypeError):
            return jsonify({"error": "Saved amount must be a valid number"}), 400

    # Target date validation
    target_date_raw = data.get("target_date")
    if not target_date_raw:
        return jsonify({"error": "Target date is required"}), 400

    target_date = parse_date_string(target_date_raw)
    if not target_date:
        return jsonify({"error": "Target date must be a valid date (YYYY-MM-DD)"}), 400

    goal = Goal(
        name=name,
        target_amount=round(target_amount, 2),
        saved_amount=round(saved_amount, 2),
        target_date=target_date,
        user_id=current_user_id
    )

    db.session.add(goal)
    db.session.commit()

    return jsonify({
        "message": "Goal created successfully",
        "goal": enrich_goal(goal)
    }), 201


# ─────────────────────────────────────────────────────────────
# GET SINGLE GOAL
# ─────────────────────────────────────────────────────────────
@goal_bp.route("/goals/<int:id>", methods=["GET"])
@goal_bp.route("/api/goals/<int:id>", methods=["GET"])
@token_required
def get_goal(current_user_id, id):
    goal = Goal.query.filter_by(id=id, user_id=current_user_id).first()
    if not goal:
        return jsonify({"error": "Goal not found"}), 404

    return jsonify(enrich_goal(goal)), 200


# ─────────────────────────────────────────────────────────────
# UPDATE GOAL
# ─────────────────────────────────────────────────────────────
@goal_bp.route("/goals/<int:id>", methods=["PUT"])
@goal_bp.route("/api/goals/<int:id>", methods=["PUT"])
@token_required
def update_goal(current_user_id, id):
    goal = Goal.query.filter_by(id=id, user_id=current_user_id).first()
    if not goal:
        return jsonify({"error": "Goal not found"}), 404

    data = request.get_json() or {}

    if "name" in data:
        name = (data.get("name") or "").strip()
        if not name:
            return jsonify({"error": "Goal name cannot be empty"}), 400
        if len(name) > 100:
            return jsonify({"error": "Goal name cannot exceed 100 characters"}), 400
        goal.name = name

    if "target_amount" in data:
        try:
            target_amt = float(data.get("target_amount"))
            if target_amt <= 0:
                return jsonify({"error": "Target amount must be greater than zero"}), 400
            goal.target_amount = round(target_amt, 2)
        except (ValueError, TypeError):
            return jsonify({"error": "Valid target amount is required"}), 400

    if "saved_amount" in data:
        try:
            saved_amt = float(data.get("saved_amount"))
            if saved_amt < 0:
                return jsonify({"error": "Saved amount cannot be negative"}), 400
            goal.saved_amount = round(saved_amt, 2)
        except (ValueError, TypeError):
            return jsonify({"error": "Valid saved amount is required"}), 400

    if "target_date" in data:
        target_date_raw = data.get("target_date")
        target_date = parse_date_string(target_date_raw)
        if not target_date:
            return jsonify({"error": "Target date must be a valid date (YYYY-MM-DD)"}), 400
        goal.target_date = target_date

    db.session.commit()

    return jsonify({
        "message": "Goal updated successfully",
        "goal": enrich_goal(goal)
    }), 200


# ─────────────────────────────────────────────────────────────
# DELETE GOAL
# ─────────────────────────────────────────────────────────────
@goal_bp.route("/goals/<int:id>", methods=["DELETE"])
@goal_bp.route("/api/goals/<int:id>", methods=["DELETE"])
@token_required
def delete_goal(current_user_id, id):
    goal = Goal.query.filter_by(id=id, user_id=current_user_id).first()
    if not goal:
        return jsonify({"error": "Goal not found"}), 404

    db.session.delete(goal)
    db.session.commit()

    return jsonify({"message": "Goal deleted successfully"}), 200


# ─────────────────────────────────────────────────────────────
# CONTRIBUTE TO GOAL
# ─────────────────────────────────────────────────────────────
@goal_bp.route("/goals/<int:id>/contribute", methods=["POST"])
@goal_bp.route("/api/goals/<int:id>/contribute", methods=["POST"])
@token_required
def contribute_to_goal(current_user_id, id):
    goal = Goal.query.filter_by(id=id, user_id=current_user_id).first()
    if not goal:
        return jsonify({"error": "Goal not found"}), 404

    data = request.get_json() or {}

    try:
        amount = float(data.get("amount"))
        if amount <= 0:
            return jsonify({"error": "Contribution amount must be greater than zero"}), 400
    except (ValueError, TypeError):
        return jsonify({"error": "Valid contribution amount is required"}), 400

    goal.saved_amount = round(float(goal.saved_amount or 0.0) + amount, 2)
    db.session.commit()

    enriched = enrich_goal(goal)
    is_completed = enriched["is_completed"]

    return jsonify({
        "message": f"Contributed ₹{amount:,.2f} successfully",
        "goal": enriched,
        "contributed_amount": round(amount, 2),
        "is_completed": is_completed
    }), 200
