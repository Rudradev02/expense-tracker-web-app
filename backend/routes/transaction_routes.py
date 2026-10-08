from flask import Blueprint, request, jsonify
from datetime import datetime
from config import db
from models import Transaction, Budget
from utils.auth import token_required

transaction_bp = Blueprint("transaction_bp", __name__)


# GET all transactions
@transaction_bp.route("/transactions", methods=["GET"])
@token_required
def get_transactions(current_user_id):
    title = request.args.get("title")
    category = request.args.get("category")

    query = Transaction.query.filter_by(user_id=current_user_id)

    if title:
        query = query.filter(Transaction.title.ilike(f"%{title}%"))

    if category:
        query = query.filter(Transaction.category.ilike(f"%{category}%"))

    transactions = query.order_by(Transaction.date.desc()).all()

    return jsonify([t.to_dict() for t in transactions])


# GET transaction by ID
@transaction_bp.route("/transactions/<int:id>", methods=["GET"])
@token_required
def get_transaction(current_user_id, id):
    transaction = Transaction.query.filter_by(
        id=id,
        user_id=current_user_id
    ).first()

    if not transaction:
        return jsonify({"error": "Transaction not found"}), 404

    return jsonify(transaction.to_dict())


# CREATE transaction
@transaction_bp.route("/transactions", methods=["POST"])
@token_required
def add_transaction(current_user_id):
    data = request.get_json()

    if not data.get("title"):
        return jsonify({"error": "Title is required"}), 400

    if data.get("amount", 0) <= 0:
        return jsonify({"error": "Amount must be greater than zero"}), 400

    if data.get("type", "").lower() not in ["income", "expense"]:
        return jsonify({"error": "Type must be income or expense"}), 400

    transaction = Transaction(
        title=data["title"],
        amount=data["amount"],
        category=data["category"],
        type=data["type"],
        user_id=current_user_id
    )

    db.session.add(transaction)
    db.session.commit()

    # Check if transaction pushes category budget over 80% or 100%
    budget_alert = None
    if transaction.type.lower() == "expense":
        budget = Budget.query.filter(
            Budget.user_id == current_user_id,
            Budget.category.ilike(transaction.category)
        ).first()

        if budget and budget.monthly_limit > 0:
            now = datetime.utcnow()
            start_of_month = datetime(now.year, now.month, 1)
            if now.month == 12:
                start_of_next_month = datetime(now.year + 1, 1, 1)
            else:
                start_of_next_month = datetime(now.year, now.month + 1, 1)

            cat_expenses = (
                Transaction.query
                .filter(
                    Transaction.user_id == current_user_id,
                    Transaction.type.ilike("expense"),
                    Transaction.category.ilike(transaction.category),
                    Transaction.date >= start_of_month,
                    Transaction.date < start_of_next_month
                )
                .all()
            )
            total_spent = sum(float(t.amount) for t in cat_expenses)
            pct = round((total_spent / budget.monthly_limit) * 100, 1)

            if pct >= 100:
                budget_alert = {
                    "category": budget.category,
                    "percentage": pct,
                    "spent": round(total_spent, 2),
                    "monthly_limit": budget.monthly_limit,
                    "level": "exceeded",
                    "message": f"Budget Exceeded: '{budget.category}' is at {pct}% (₹{total_spent:,.0f} / ₹{budget.monthly_limit:,.0f})"
                }
            elif pct >= 80:
                budget_alert = {
                    "category": budget.category,
                    "percentage": pct,
                    "spent": round(total_spent, 2),
                    "monthly_limit": budget.monthly_limit,
                    "level": "warning",
                    "message": f"Budget Warning: '{budget.category}' is at {pct}% of monthly limit (₹{total_spent:,.0f} / ₹{budget.monthly_limit:,.0f})"
                }

    return jsonify({
        "message": "Transaction added successfully",
        "transaction": transaction.to_dict(),
        "budget_alert": budget_alert
    }), 201


# UPDATE transaction
@transaction_bp.route("/transactions/<int:id>", methods=["PUT"])
@token_required
def update_transaction(current_user_id, id):
    transaction = Transaction.query.filter_by(
        id=id,
        user_id=current_user_id
    ).first()

    if not transaction:
        return jsonify({"error": "Transaction not found"}), 404

    data = request.get_json()

    if "title" in data and not data["title"]:
        return jsonify({"error": "Title cannot be empty"}), 400

    if "amount" in data and data["amount"] <= 0:
        return jsonify({"error": "Amount must be greater than zero"}), 400

    if "type" in data and data["type"].lower() not in ["income", "expense"]:
        return jsonify({"error": "Type must be income or expense"}), 400

    transaction.title = data.get("title", transaction.title)
    transaction.amount = data.get("amount", transaction.amount)
    transaction.category = data.get("category", transaction.category)
    transaction.type = data.get("type", transaction.type)

    db.session.commit()

    return jsonify({
        "message": "Transaction updated successfully",
        "transaction": transaction.to_dict()
    })


# DELETE transaction
@transaction_bp.route("/transactions/<int:id>", methods=["DELETE"])
@token_required
def delete_transaction(current_user_id, id):
    transaction = Transaction.query.filter_by(
        id=id,
        user_id=current_user_id
    ).first()

    if not transaction:
        return jsonify({"error": "Transaction not found"}), 404

    db.session.delete(transaction)
    db.session.commit()

    return jsonify({
        "message": "Transaction deleted successfully"
    })


# SUMMARY
@transaction_bp.route("/summary", methods=["GET"])
@token_required
def get_summary(current_user_id):
    transactions = (
        Transaction.query
        .filter_by(user_id=current_user_id)
        .order_by(Transaction.date)
        .all()
    )

    income = 0
    expense = 0
    expense_by_category = {}
    monthly_trends_dict = {}

    for t in transactions:
        if t.type.lower() == "income":
            income += t.amount
        else:
            expense += t.amount

            cat = t.category.strip().title()
            expense_by_category[cat] = (
                expense_by_category.get(cat, 0) + t.amount
            )

        month_key = t.date.strftime("%b %Y")

        if month_key not in monthly_trends_dict:
            monthly_trends_dict[month_key] = {
                "name": month_key,
                "income": 0,
                "expense": 0
            }

        if t.type.lower() == "income":
            monthly_trends_dict[month_key]["income"] += t.amount
        else:
            monthly_trends_dict[month_key]["expense"] += t.amount

    return jsonify({
        "income": income,
        "expense": expense,
        "balance": income - expense,
        "expense_by_category": [
            {"name": k, "value": v}
            for k, v in expense_by_category.items()
        ],
        "monthly_trends": list(monthly_trends_dict.values())
    })