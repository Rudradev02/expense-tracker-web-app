from flask import Blueprint, request, jsonify
from datetime import datetime, date
from config import db
from models import RecurringRule
from utils.auth import token_required
from utils.recurring_processor import process_due_recurring_rules, compute_next_run_date

recurring_bp = Blueprint("recurring_bp", __name__)


# GET all recurring rules for authenticated user
@recurring_bp.route("/recurring-rules", methods=["GET"])
@token_required
def get_recurring_rules(current_user_id):
    # Process any due transactions first so state is up-to-date
    process_due_recurring_rules(user_id=current_user_id)

    rules = RecurringRule.query.filter_by(user_id=current_user_id).order_by(RecurringRule.created_at.desc()).all()
    return jsonify([rule.to_dict() for rule in rules])


# GET single recurring rule
@recurring_bp.route("/recurring-rules/<int:id>", methods=["GET"])
@token_required
def get_recurring_rule(current_user_id, id):
    rule = RecurringRule.query.filter_by(id=id, user_id=current_user_id).first()
    if not rule:
        return jsonify({"error": "Recurring rule not found"}), 404
    return jsonify(rule.to_dict())


# CREATE a new recurring rule
@recurring_bp.route("/recurring-rules", methods=["POST"])
@token_required
def create_recurring_rule(current_user_id):
    data = request.get_json() or {}

    description = (data.get("description") or data.get("title") or "").strip()
    if not description:
        return jsonify({"error": "Description is required"}), 400

    try:
        amount = float(data.get("amount", 0))
        if amount <= 0:
            return jsonify({"error": "Amount must be greater than zero"}), 400
    except (ValueError, TypeError):
        return jsonify({"error": "Valid numerical amount is required"}), 400

    rule_type = (data.get("type") or "expense").strip().lower()
    if rule_type not in ["income", "expense"]:
        return jsonify({"error": "Type must be income or expense"}), 400

    category = (data.get("category") or "").strip()
    if not category:
        return jsonify({"error": "Category is required"}), 400

    frequency = (data.get("frequency") or "monthly").strip().lower()
    if frequency not in ["daily", "weekly", "monthly", "yearly"]:
        return jsonify({"error": "Frequency must be daily, weekly, monthly, or yearly"}), 400

    # Parse start_date
    start_date_val = date.today()
    if data.get("start_date"):
        try:
            start_date_val = datetime.strptime(str(data["start_date"])[:10], "%Y-%m-%d").date()
        except (ValueError, TypeError):
            pass

    # Parse optional end_date
    end_date_val = None
    if data.get("end_date"):
        try:
            end_date_val = datetime.strptime(str(data["end_date"])[:10], "%Y-%m-%d").date()
            if end_date_val < start_date_val:
                return jsonify({"error": "End date cannot be earlier than start date"}), 400
        except (ValueError, TypeError):
            pass

    # Next run date: defaults to start_date, or user-supplied next_run_date
    next_run_val = start_date_val
    if data.get("next_run_date"):
        try:
            next_run_val = datetime.strptime(str(data["next_run_date"])[:10], "%Y-%m-%d").date()
        except (ValueError, TypeError):
            pass

    rule = RecurringRule(
        description=description,
        amount=amount,
        type=rule_type,
        category=category,
        frequency=frequency,
        start_date=start_date_val,
        end_date=end_date_val,
        next_run_date=next_run_val,
        active=bool(data.get("active", True)),
        user_id=current_user_id
    )

    db.session.add(rule)
    db.session.commit()

    # If the rule is active and due immediately, process it
    if rule.active and rule.next_run_date <= date.today():
        process_due_recurring_rules(user_id=current_user_id)
        rule = RecurringRule.query.get(rule.id)

    return jsonify(rule.to_dict()), 201


# UPDATE a recurring rule
@recurring_bp.route("/recurring-rules/<int:id>", methods=["PUT", "PATCH"])
@token_required
def update_recurring_rule(current_user_id, id):
    rule = RecurringRule.query.filter_by(id=id, user_id=current_user_id).first()
    if not rule:
        return jsonify({"error": "Recurring rule not found"}), 404

    data = request.get_json() or {}

    if "description" in data or "title" in data:
        desc = (data.get("description") or data.get("title") or "").strip()
        if not desc:
            return jsonify({"error": "Description cannot be empty"}), 400
        rule.description = desc

    if "amount" in data:
        try:
            amt = float(data["amount"])
            if amt <= 0:
                return jsonify({"error": "Amount must be greater than zero"}), 400
            rule.amount = amt
        except (ValueError, TypeError):
            return jsonify({"error": "Valid numerical amount is required"}), 400

    if "type" in data:
        t = data["type"].strip().lower()
        if t not in ["income", "expense"]:
            return jsonify({"error": "Type must be income or expense"}), 400
        rule.type = t

    if "category" in data:
        cat = data["category"].strip()
        if not cat:
            return jsonify({"error": "Category cannot be empty"}), 400
        rule.category = cat

    if "frequency" in data:
        freq = data["frequency"].strip().lower()
        if freq not in ["daily", "weekly", "monthly", "yearly"]:
            return jsonify({"error": "Frequency must be daily, weekly, monthly, or yearly"}), 400
        rule.frequency = freq

    if "end_date" in data:
        if data["end_date"]:
            try:
                ed = datetime.strptime(str(data["end_date"])[:10], "%Y-%m-%d").date()
                if ed < rule.start_date:
                    return jsonify({"error": "End date cannot be earlier than start date"}), 400
                rule.end_date = ed
            except (ValueError, TypeError):
                pass
        else:
            rule.end_date = None

    if "next_run_date" in data and data["next_run_date"]:
        try:
            rule.next_run_date = datetime.strptime(str(data["next_run_date"])[:10], "%Y-%m-%d").date()
        except (ValueError, TypeError):
            pass

    if "active" in data:
        rule.active = bool(data["active"])

    db.session.commit()

    if rule.active and rule.next_run_date <= date.today():
        process_due_recurring_rules(user_id=current_user_id)
        rule = RecurringRule.query.get(rule.id)

    return jsonify(rule.to_dict())


# TOGGLE active / paused state
@recurring_bp.route("/recurring-rules/<int:id>/toggle", methods=["POST", "PATCH"])
@token_required
def toggle_recurring_rule(current_user_id, id):
    rule = RecurringRule.query.filter_by(id=id, user_id=current_user_id).first()
    if not rule:
        return jsonify({"error": "Recurring rule not found"}), 404

    rule.active = not rule.active
    db.session.commit()

    if rule.active and rule.next_run_date <= date.today():
        process_due_recurring_rules(user_id=current_user_id)
        rule = RecurringRule.query.get(rule.id)

    return jsonify(rule.to_dict())


# DELETE a recurring rule
@recurring_bp.route("/recurring-rules/<int:id>", methods=["DELETE"])
@token_required
def delete_recurring_rule(current_user_id, id):
    rule = RecurringRule.query.filter_by(id=id, user_id=current_user_id).first()
    if not rule:
        return jsonify({"error": "Recurring rule not found"}), 404

    db.session.delete(rule)
    db.session.commit()

    return jsonify({"message": "Recurring rule deleted successfully"})


# MANUALLY trigger processing of due recurring rules
@recurring_bp.route("/recurring-rules/process", methods=["POST"])
@token_required
def trigger_processing(current_user_id):
    created_count = process_due_recurring_rules(user_id=current_user_id)
    return jsonify({
        "created_count": created_count,
        "message": f"Processed successfully: {created_count} transaction(s) generated."
    })
