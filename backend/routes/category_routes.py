from flask import Blueprint, request, jsonify
from config import db
from models import Category, Transaction
from utils.auth import token_required

category_bp = Blueprint("category_bp", __name__)


@category_bp.route("/categories", methods=["GET"])
@token_required
def get_categories(current_user_id):
    categories = (
        Category.query
        .filter_by(user_id=current_user_id)
        .order_by(Category.name)
        .all()
    )
    return jsonify([c.to_dict() for c in categories])


@category_bp.route("/categories", methods=["POST"])
@token_required
def add_category(current_user_id):
    data = request.get_json() or {}
    name = (data.get("name") or "").strip()

    if not name:
        return jsonify({"error": "Category name is required"}), 400

    if len(name) > 50:
        return jsonify({"error": "Category name must be 50 characters or less"}), 400

    existing = (
        Category.query
        .filter(
            Category.user_id == current_user_id,
            Category.name.ilike(name)
        )
        .first()
    )
    if existing:
        return jsonify({"error": "Category already exists"}), 409

    category = Category(name=name, user_id=current_user_id)
    db.session.add(category)
    db.session.commit()

    return jsonify({"message": "Category created", "category": category.to_dict()}), 201


@category_bp.route("/categories/<int:id>", methods=["DELETE"])
@token_required
def delete_category(current_user_id, id):
    category = Category.query.filter_by(id=id, user_id=current_user_id).first()

    if not category:
        return jsonify({"error": "Category not found"}), 404

    in_use = Transaction.query.filter(
        Transaction.user_id == current_user_id,
        Transaction.category.ilike(category.name)
    ).count()

    if in_use > 0:
        return jsonify({
            "error": f"Cannot delete — {in_use} transaction(s) use this category"
        }), 409

    db.session.delete(category)
    db.session.commit()

    return jsonify({"message": "Category deleted successfully"})
