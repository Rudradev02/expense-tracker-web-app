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


# ─────────────────────────────────────────────────────────────
# AUTO-SUGGEST CATEGORY FROM DESCRIPTION
# ─────────────────────────────────────────────────────────────
import re
from collections import Counter
from utils.category_keywords import CATEGORY_KEYWORD_RULES


@category_bp.route("/suggest-category", methods=["GET", "POST"])
@token_required
def suggest_category(current_user_id):
    """
    Predicts the most likely category for a given transaction description.
    Checks user's past transaction history first (learned merchant preferences),
    followed by the editable keyword rules mapping.
    """
    if request.method == "POST":
        data = request.get_json(silent=True) or {}
        raw_desc = data.get("description") or data.get("title") or ""
    else:
        raw_desc = (
            request.args.get("description") or
            request.args.get("title") or
            request.args.get("q") or
            ""
        )

    desc = raw_desc.strip()
    if not desc or len(desc) < 2:
        return jsonify({
            "suggested_category": None,
            "confidence": 0.0,
            "source": None,
            "matched_keyword": None,
        }), 200

    desc_lower = desc.lower()

    # Fetch user's registered categories for exact name alignment
    user_cats = Category.query.filter_by(user_id=current_user_id).all()
    user_cat_names = [c.name for c in user_cats]

    def resolve_category_name(candidate_name):
        """Map candidate to the user's registered category name if matching."""
        if not candidate_name:
            return None
        cand_lower = candidate_name.strip().lower()
        # 1. Exact case-insensitive match
        for name in user_cat_names:
            if name.lower() == cand_lower:
                return name
        # 2. Substring match (e.g. candidate "Food" in "Food & Dining")
        for name in user_cat_names:
            if cand_lower in name.lower() or name.lower() in cand_lower:
                return name
        # 3. Fallback to candidate in title case
        return candidate_name.strip().title()

    # ─────────────────────────────────────────────────────────────
    # STEP 1: Learn from user's own past transactions (highest priority)
    # ─────────────────────────────────────────────────────────────
    past_txs = (
        Transaction.query
        .filter_by(user_id=current_user_id)
        .order_by(Transaction.date.desc())
        .limit(200)
        .all()
    )

    # A) Check exact title match
    exact_matches = [
        t.category.strip().title()
        for t in past_txs
        if t.title and t.title.strip().lower() == desc_lower and t.category
    ]
    if exact_matches:
        counts = Counter(exact_matches)
        top_cat, freq = counts.most_common(1)[0]
        confidence = min(0.98, round(0.90 + 0.02 * freq, 2))
        return jsonify({
            "suggested_category": resolve_category_name(top_cat),
            "confidence": confidence,
            "source": "history",
            "matched_keyword": desc,
        }), 200

    # B) Check merchant / significant word match in past transactions
    words = [w for w in re.findall(r"\b[a-zA-Z0-9]{3,}\b", desc_lower)]
    history_matches = []
    for t in past_txs:
        if not t.title or not t.category:
            continue
        t_title = t.title.strip().lower()
        # Check if description contains past title or vice versa
        if len(t_title) >= 3 and (t_title in desc_lower or desc_lower in t_title):
            history_matches.append(t.category.strip().title())
        elif words:
            t_words = set(re.findall(r"\b[a-zA-Z0-9]{3,}\b", t_title))
            if set(words).intersection(t_words):
                history_matches.append(t.category.strip().title())

    if history_matches:
        counts = Counter(history_matches)
        top_cat, freq = counts.most_common(1)[0]
        confidence = min(0.92, round(0.84 + 0.02 * freq, 2))
        return jsonify({
            "suggested_category": resolve_category_name(top_cat),
            "confidence": confidence,
            "source": "history",
            "matched_keyword": words[0] if words else desc,
        }), 200

    # ─────────────────────────────────────────────────────────────
    # STEP 2: Evaluate keyword rules mapping
    # ─────────────────────────────────────────────────────────────
    matched_rules = []
    for category_name, keywords in CATEGORY_KEYWORD_RULES.items():
        for kw in keywords:
            kw_clean = kw.strip().lower()
            # Whole word or boundary pattern match
            pattern = r"(?<!\w)" + re.escape(kw_clean) + r"(?!\w)"
            if re.search(pattern, desc_lower):
                matched_rules.append((category_name, kw_clean, len(kw_clean)))
            elif len(kw_clean) >= 4 and kw_clean in desc_lower:
                matched_rules.append((category_name, kw_clean, len(kw_clean)))

    if matched_rules:
        # Prefer the longest/most specific keyword match
        matched_rules.sort(key=lambda x: x[2], reverse=True)
        best_cat, matched_kw, kw_len = matched_rules[0]
        confidence = 0.88 if kw_len >= 5 else 0.82
        return jsonify({
            "suggested_category": resolve_category_name(best_cat),
            "confidence": confidence,
            "source": "keyword",
            "matched_keyword": matched_kw,
        }), 200

    # ─────────────────────────────────────────────────────────────
    # STEP 3: Fallback - No confident match found
    # ─────────────────────────────────────────────────────────────
    return jsonify({
        "suggested_category": None,
        "confidence": 0.0,
        "source": None,
        "matched_keyword": None,
    }), 200
