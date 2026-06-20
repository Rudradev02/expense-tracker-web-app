from flask import Blueprint, request, jsonify
from config import db
from models import Transaction

transaction_bp = Blueprint("transaction_bp", __name__)


# GET all transactions with optional search and category filter
@transaction_bp.route("/transactions", methods=["GET"])
def get_transactions():
    title = request.args.get("title")
    category = request.args.get("category")

    query = Transaction.query

    if title:
        query = query.filter(Transaction.title.ilike(f"%{title}%"))

    if category:
        query = query.filter(Transaction.category.ilike(f"%{category}%"))

    transactions = query.all()

    return jsonify([
        {
            "id": t.id,
            "title": t.title,
            "amount": t.amount,
            "category": t.category,
            "type": t.type,
            "date": t.date.strftime("%Y-%m-%d %H:%M:%S")
        }
        for t in transactions
    ])


# GET transaction by ID
@transaction_bp.route("/transactions/<int:id>", methods=["GET"])
def get_transaction(id):
    transaction = Transaction.query.get(id)

    if not transaction:
        return jsonify({"error": "Transaction not found"}), 404

    return jsonify({
        "id": transaction.id,
        "title": transaction.title,
        "amount": transaction.amount,
        "category": transaction.category,
        "type": transaction.type,
        "date": transaction.date.strftime("%Y-%m-%d %H:%M:%S")
    })


# CREATE transaction
@transaction_bp.route("/transactions", methods=["POST"])
def add_transaction():
    data = request.get_json()

    # Validation
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
        type=data["type"]
    )

    db.session.add(transaction)
    db.session.commit()

    return jsonify({
        "message": "Transaction added successfully"
    }), 201


# UPDATE transaction
@transaction_bp.route("/transactions/<int:id>", methods=["PUT"])
def update_transaction(id):
    transaction = Transaction.query.get(id)

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
        "message": "Transaction updated successfully"
    })


# DELETE transaction
@transaction_bp.route("/transactions/<int:id>", methods=["DELETE"])
def delete_transaction(id):
    transaction = Transaction.query.get(id)

    if not transaction:
        return jsonify({"error": "Transaction not found"}), 404

    db.session.delete(transaction)
    db.session.commit()

    return jsonify({
        "message": "Transaction deleted successfully"
    })


# SUMMARY
@transaction_bp.route("/summary", methods=["GET"])
def get_summary():
    transactions = Transaction.query.all()

    income = sum(t.amount for t in transactions if t.type.lower() == "income")
    expense = sum(t.amount for t in transactions if t.type.lower() == "expense")

    return jsonify({
        "income": income,
        "expense": expense,
        "balance": income - expense
    })