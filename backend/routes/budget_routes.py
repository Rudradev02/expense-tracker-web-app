from flask import Blueprint, request, jsonify
from datetime import datetime
from config import db
from models import Budget, Transaction, Category
from utils.auth import token_required

budget_bp = Blueprint("budget_bp", __name__)


# ─────────────────────────────────────────────────────────────
# LIST ALL BUDGETS
# ─────────────────────────────────────────────────────────────
@budget_bp.route("/budgets", methods=["GET"])
@token_required
def get_budgets(current_user_id):
    budgets = (
        Budget.query
        .filter_by(user_id=current_user_id)
        .order_by(Budget.category)
        .all()
    )
    return jsonify([b.to_dict() for b in budgets])


# ─────────────────────────────────────────────────────────────
# CREATE OR UPSERT BUDGET
# ─────────────────────────────────────────────────────────────
@budget_bp.route("/budgets", methods=["POST"])
@token_required
def create_budget(current_user_id):
    data = request.get_json() or {}

    category = (data.get("category") or "").strip()
    if not category:
        return jsonify({"error": "Category name is required"}), 400

    if len(category) > 50:
        return jsonify({"error": "Category name must be 50 characters or less"}), 400

    raw_limit = data.get("monthly_limit")
    try:
        monthly_limit = float(raw_limit)
        if monthly_limit <= 0:
            return jsonify({"error": "Monthly limit must be greater than zero"}), 400
    except (ValueError, TypeError):
        return jsonify({"error": "Valid monthly limit amount is required"}), 400

    # Case-insensitive category match for this user
    existing = (
        Budget.query
        .filter(
            Budget.user_id == current_user_id,
            Budget.category.ilike(category)
        )
        .first()
    )

    if existing:
        existing.monthly_limit = round(monthly_limit, 2)
        existing.category = category.title()
        db.session.commit()
        return jsonify({
            "message": "Budget updated successfully",
            "budget": existing.to_dict()
        }), 200

    budget = Budget(
        category=category.title(),
        monthly_limit=round(monthly_limit, 2),
        user_id=current_user_id
    )

    db.session.add(budget)
    db.session.commit()

    return jsonify({
        "message": "Budget created successfully",
        "budget": budget.to_dict()
    }), 201


# ─────────────────────────────────────────────────────────────
# UPDATE BUDGET
# ─────────────────────────────────────────────────────────────
@budget_bp.route("/budgets/<int:id>", methods=["PUT"])
@token_required
def update_budget(current_user_id, id):
    budget = Budget.query.filter_by(id=id, user_id=current_user_id).first()
    if not budget:
        return jsonify({"error": "Budget not found"}), 404

    data = request.get_json() or {}

    if "monthly_limit" in data:
        try:
            limit = float(data["monthly_limit"])
            if limit <= 0:
                return jsonify({"error": "Monthly limit must be greater than zero"}), 400
            budget.monthly_limit = round(limit, 2)
        except (ValueError, TypeError):
            return jsonify({"error": "Valid monthly limit amount is required"}), 400

    if "category" in data:
        cat = (data["category"] or "").strip()
        if not cat:
            return jsonify({"error": "Category cannot be empty"}), 400
        budget.category = cat.title()

    db.session.commit()

    return jsonify({
        "message": "Budget updated successfully",
        "budget": budget.to_dict()
    })


# ─────────────────────────────────────────────────────────────
# DELETE BUDGET
# ─────────────────────────────────────────────────────────────
@budget_bp.route("/budgets/<int:id>", methods=["DELETE"])
@token_required
def delete_budget(current_user_id, id):
    budget = Budget.query.filter_by(id=id, user_id=current_user_id).first()
    if not budget:
        return jsonify({"error": "Budget not found"}), 404

    db.session.delete(budget)
    db.session.commit()

    return jsonify({"message": "Budget deleted successfully"})


# ─────────────────────────────────────────────────────────────
# CURRENT MONTH SPENT VS LIMIT PER CATEGORY
# ─────────────────────────────────────────────────────────────
@budget_bp.route("/budgets/status", methods=["GET"])
@token_required
def get_budget_status(current_user_id):
    now = datetime.utcnow()
    start_of_month = datetime(now.year, now.month, 1)
    if now.month == 12:
        start_of_next_month = datetime(now.year + 1, 1, 1)
    else:
        start_of_next_month = datetime(now.year, now.month + 1, 1)

    # Current month expense transactions for this user
    expenses = (
        Transaction.query
        .filter(
            Transaction.user_id == current_user_id,
            Transaction.type.ilike("expense"),
            Transaction.date >= start_of_month,
            Transaction.date < start_of_next_month
        )
        .all()
    )

    spent_by_category = {}
    for t in expenses:
        cat_key = t.category.strip().title() if t.category else "Uncategorized"
        spent_by_category[cat_key] = spent_by_category.get(cat_key, 0.0) + float(t.amount)

    budgets = Budget.query.filter_by(user_id=current_user_id).all()
    budget_dict = {b.category.strip().title(): b for b in budgets}

    system_categories = Category.query.order_by(Category.name).all()
    all_cat_names = sorted(list(set(
        [c.name.strip().title() for c in system_categories] +
        list(budget_dict.keys()) +
        list(spent_by_category.keys())
    )))

    categories_status = []
    total_budgeted_amount = 0.0
    total_budgeted_spent = 0.0
    total_all_spent = 0.0

    for cat in all_cat_names:
        spent = spent_by_category.get(cat, 0.0)
        total_all_spent += spent
        budget = budget_dict.get(cat)

        if budget:
            limit = float(budget.monthly_limit)
            total_budgeted_amount += limit
            total_budgeted_spent += spent
            pct = round((spent / limit) * 100, 1) if limit > 0 else 0.0
            remaining = max(0.0, round(limit - spent, 2))
            status_tag = "exceeded" if pct >= 100 else ("warning" if pct >= 80 else "ok")

            categories_status.append({
                "category": cat,
                "budget_id": budget.id,
                "monthly_limit": limit,
                "spent": round(spent, 2),
                "remaining": remaining,
                "percentage": pct,
                "has_budget": True,
                "status": status_tag
            })
        else:
            categories_status.append({
                "category": cat,
                "budget_id": None,
                "monthly_limit": None,
                "spent": round(spent, 2),
                "remaining": None,
                "percentage": None,
                "has_budget": False,
                "status": "no_budget"
            })

    # Sort: categories with budgets first (sorted by percentage desc), then unbudgeted
    categories_status.sort(
        key=lambda x: (
            0 if x["has_budget"] else 1,
            -(x["percentage"] or 0)
        )
    )

    return jsonify({
        "month": now.strftime("%B %Y"),
        "month_short": now.strftime("%b %Y"),
        "year": now.year,
        "month_num": now.month,
        "total_budget": round(total_budgeted_amount, 2),
        "total_budgeted_spent": round(total_budgeted_spent, 2),
        "total_all_spent": round(total_all_spent, 2),
        "categories": categories_status
    })
