from flask import Blueprint, request, jsonify
from config import db
from models import Category, Transaction

category_bp = Blueprint("category_bp", __name__)


@category_bp.route("/categories", methods=["GET"])
def get_categories():
    categories = Category.query.order_by(Category.name).all()
    return jsonify([c.to_dict() for c in categories])


@category_bp.route("/categories", methods=["POST"])
def add_category():
    data = request.get_json() or {}
    name = (data.get("name") or "").strip()

    if not name:
        return jsonify({"error": "Category name is required"}), 400

    if len(name) > 50:
        return jsonify({"error": "Category name must be 50 characters or less"}), 400

    existing = Category.query.filter(Category.name.ilike(name)).first()
    if existing:
        return jsonify({"error": "Category already exists"}), 409

    category = Category(name=name)
    db.session.add(category)
    db.session.commit()

    return jsonify({"message": "Category created", "category": category.to_dict()}), 201


@category_bp.route("/categories/<int:id>", methods=["DELETE"])
def delete_category(id):
    category = db.session.get(Category, id)

    if not category:
        return jsonify({"error": "Category not found"}), 404

    in_use = Transaction.query.filter(
        Transaction.category.ilike(category.name)
    ).count()

    if in_use > 0:
        return jsonify({
            "error": f"Cannot delete — {in_use} transaction(s) use this category"
        }), 409

    db.session.delete(category)
    db.session.commit()

    return jsonify({"message": "Category deleted successfully"})
