from flask import Blueprint, request, jsonify, Response
from datetime import datetime
from config import db
from models import Transaction, Budget
from utils.auth import token_required
from utils.csv_generator import generate_csv
from utils.pdf_generator import generate_pdf
from sqlalchemy import or_

transaction_bp = Blueprint("transaction_bp", __name__)


def build_transaction_query(current_user_id, args):
    query = Transaction.query.filter_by(user_id=current_user_id)

    # 1. Search (matches title/description/notes)
    search = (
        args.get("search") or
        args.get("title") or
        args.get("q") or
        ""
    ).strip()
    if search:
        query = query.filter(Transaction.title.ilike(f"%{search}%"))

    # 2. Type filter (income, expense, all)
    tx_type = (args.get("type") or "").strip().lower()
    if tx_type in ["income", "expense"]:
        query = query.filter(Transaction.type.ilike(tx_type))

    # 3. Category filter (multi-select: comma-separated or multiple args)
    raw_list = args.getlist("category") if hasattr(args, "getlist") else []
    categories = []
    for item in raw_list:
        if item and item.strip():
            for c in item.split(","):
                if c.strip():
                    categories.append(c.strip())

    if not categories and args.get("category"):
        raw_cats = args.get("category")
        categories = [c.strip() for c in raw_cats.split(",") if c.strip()]

    if categories:
        query = query.filter(or_(*[Transaction.category.ilike(c) for c in categories]))

    # 4. Date range filter (start_date, end_date)
    start_date = args.get("start_date")
    if start_date:
        try:
            start_dt = datetime.strptime(start_date.strip(), "%Y-%m-%d")
            query = query.filter(Transaction.date >= start_dt)
        except (ValueError, TypeError):
            pass

    end_date = args.get("end_date")
    if end_date:
        try:
            end_dt = datetime.strptime(end_date.strip(), "%Y-%m-%d").replace(
                hour=23, minute=59, second=59, microsecond=999999
            )
            query = query.filter(Transaction.date <= end_dt)
        except (ValueError, TypeError):
            pass

    # 5. Min / Max amount filters
    min_amount = args.get("min_amount")
    if min_amount:
        try:
            query = query.filter(Transaction.amount >= float(min_amount))
        except (ValueError, TypeError):
            pass

    max_amount = args.get("max_amount")
    if max_amount:
        try:
            query = query.filter(Transaction.amount <= float(max_amount))
        except (ValueError, TypeError):
            pass

    # 6. Sorting (date, amount, category, title)
    sort_by = (args.get("sort_by") or "date").strip().lower()
    sort_order = (args.get("sort_order") or "desc").strip().lower()

    col_map = {
        "date": Transaction.date,
        "amount": Transaction.amount,
        "category": Transaction.category,
        "title": Transaction.title,
    }
    target_col = col_map.get(sort_by, Transaction.date)

    if sort_order == "asc":
        query = query.order_by(target_col.asc())
    else:
        query = query.order_by(target_col.desc())

    return query


# GET all transactions
@transaction_bp.route("/transactions", methods=["GET"])
@token_required
def get_transactions(current_user_id):
    query = build_transaction_query(current_user_id, request.args)

    # Optional pagination
    page = request.args.get("page", type=int)
    per_page = request.args.get("per_page", type=int)

    if page and per_page and page > 0 and per_page > 0:
        total = query.count()
        transactions = query.offset((page - 1) * per_page).limit(per_page).all()
        return jsonify({
            "items": [t.to_dict() for t in transactions],
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": (total + per_page - 1) // per_page
        })

    transactions = query.all()
    return jsonify([t.to_dict() for t in transactions])


# EXPORT transactions (CSV or PDF)
@transaction_bp.route("/transactions/export", methods=["GET"])
@token_required
def export_transactions(current_user_id):
    fmt = (request.args.get("format") or "csv").strip().lower()
    if fmt not in ["csv", "pdf"]:
        return jsonify({"error": "Invalid export format. Supported formats: csv, pdf"}), 400

    # Build query respecting all active filters, dates, and sort
    query = build_transaction_query(current_user_id, request.args)
    transactions = query.all()

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    if fmt == "csv":
        csv_bytes = generate_csv(transactions)
        filename = f"transactions_{timestamp}.csv"
        return Response(
            csv_bytes,
            mimetype="text/csv; charset=utf-8",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Content-Type": "text/csv; charset=utf-8",
            }
        )

    elif fmt == "pdf":
        filter_meta = {
            "start_date": request.args.get("start_date"),
            "end_date": request.args.get("end_date"),
            "type": request.args.get("type"),
            "category": request.args.get("category"),
        }
        pdf_bytes = generate_pdf(transactions, filters=filter_meta)
        filename = f"transactions_{timestamp}.pdf"
        return Response(
            pdf_bytes,
            mimetype="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Content-Type": "application/pdf",
            }
        )



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

    # If marked as recurring, establish recurring rule and attach to transaction
    if data.get("is_recurring"):
        try:
            from models import RecurringRule
            from utils.recurring_processor import compute_next_run_date
            frequency = (data.get("frequency") or "monthly").strip().lower()
            if frequency not in ["daily", "weekly", "monthly", "yearly"]:
                frequency = "monthly"

            today = datetime.utcnow().date()
            next_run = compute_next_run_date(today, frequency, today.day)

            end_date = None
            if data.get("end_date"):
                try:
                    end_date = datetime.strptime(str(data["end_date"])[:10], "%Y-%m-%d").date()
                except Exception:
                    pass

            rule = RecurringRule(
                description=transaction.title,
                amount=transaction.amount,
                type=transaction.type,
                category=transaction.category,
                frequency=frequency,
                start_date=today,
                next_run_date=next_run,
                end_date=end_date,
                active=True,
                user_id=current_user_id
            )
            db.session.add(rule)
            db.session.flush()
            transaction.recurring_rule_id = rule.id
            db.session.commit()
        except Exception as e:
            pass


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
@transaction_bp.route("/transactions/<int:id>", methods=["PUT", "PATCH"])
@token_required
def update_transaction(current_user_id, id):
    transaction = Transaction.query.filter_by(
        id=id,
        user_id=current_user_id
    ).first()

    if not transaction:
        return jsonify({"error": "Transaction not found"}), 404

    data = request.get_json() or {}

    if "title" in data:
        title = str(data["title"]).strip()
        if not title:
            return jsonify({"error": "Title cannot be empty"}), 400
        transaction.title = title

    if "amount" in data:
        try:
            amt = float(data["amount"])
            if amt <= 0:
                return jsonify({"error": "Amount must be greater than zero"}), 400
            transaction.amount = amt
        except (ValueError, TypeError):
            return jsonify({"error": "Amount must be a valid positive number"}), 400

    if "type" in data:
        t_type = str(data["type"]).strip().lower()
        if t_type not in ["income", "expense"]:
            return jsonify({"error": "Type must be income or expense"}), 400
        transaction.type = t_type

    if "category" in data:
        cat = str(data["category"]).strip()
        if not cat:
            return jsonify({"error": "Category cannot be empty"}), 400
        transaction.category = cat

    if "date" in data and data["date"]:
        try:
            transaction.date = datetime.strptime(str(data["date"]).strip(), "%Y-%m-%d")
        except (ValueError, TypeError):
            pass

    db.session.commit()

    # Check if updated transaction pushes category budget over 80% or 100%
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
        "message": "Transaction updated successfully",
        "transaction": transaction.to_dict(),
        "budget_alert": budget_alert
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


# INSIGHTS
@transaction_bp.route("/insights", methods=["GET"])
@token_required
def get_insights(current_user_id):
    now = datetime.utcnow()
    current_year = now.year
    current_month = now.month

    # Current month date bounds
    start_current = datetime(current_year, current_month, 1)
    if current_month == 12:
        start_next = datetime(current_year + 1, 1, 1)
    else:
        start_next = datetime(current_year, current_month + 1, 1)

    # Previous month date bounds
    if current_month == 1:
        start_prev = datetime(current_year - 1, 12, 1)
    else:
        start_prev = datetime(current_year, current_month - 1, 1)
    end_prev = start_current

    # Fetch transactions across previous and current months
    transactions = (
        Transaction.query
        .filter(
            Transaction.user_id == current_user_id,
            Transaction.date >= start_prev,
            Transaction.date < start_next
        )
        .all()
    )

    curr_income = 0.0
    curr_expense = 0.0
    curr_cat_expenses = {}

    prev_income = 0.0
    prev_expense = 0.0
    prev_cat_expenses = {}

    for t in transactions:
        is_curr = t.date >= start_current
        amt = float(t.amount or 0)
        t_type = (t.type or "").lower()
        cat = (t.category or "General").strip().title()

        if is_curr:
            if t_type == "income":
                curr_income += amt
            else:
                curr_expense += amt
                curr_cat_expenses[cat] = curr_cat_expenses.get(cat, 0.0) + amt
        else:
            if t_type == "income":
                prev_income += amt
            else:
                prev_expense += amt
                prev_cat_expenses[cat] = prev_cat_expenses.get(cat, 0.0) + amt

    insights = []

    # 1. Category expense comparison vs last month (most significant shift)
    candidate_cat = None
    candidate_pct = 0
    # Prioritize categories with highest current expenditure
    sorted_curr_cats = sorted(curr_cat_expenses.items(), key=lambda x: x[1], reverse=True)
    for cat, curr_amt in sorted_curr_cats:
        if cat in prev_cat_expenses and prev_cat_expenses[cat] > 0:
            prev_amt = prev_cat_expenses[cat]
            pct = round(((curr_amt - prev_amt) / prev_amt) * 100)
            if abs(pct) >= 1:
                candidate_cat = cat
                candidate_pct = pct
                break

    if candidate_cat:
        if candidate_pct > 0:
            insights.append({
                "id": "category_trend",
                "prefix": "You spent ",
                "highlight": f"{candidate_pct}% more",
                "suffix": f" on {candidate_cat} than last month.",
                "type": "expense",
                "direction": "up"
            })
        elif candidate_pct < 0:
            insights.append({
                "id": "category_trend",
                "prefix": "You spent ",
                "highlight": f"{abs(candidate_pct)}% less",
                "suffix": f" on {candidate_cat} than last month.",
                "type": "income",
                "direction": "down"
            })
    elif prev_expense > 0 and curr_expense > 0:
        overall_pct = round(((curr_expense - prev_expense) / prev_expense) * 100)
        if overall_pct > 0:
            insights.append({
                "id": "overall_expense_trend",
                "prefix": "Your overall spending is ",
                "highlight": f"{overall_pct}% higher",
                "suffix": " than last month.",
                "type": "expense",
                "direction": "up"
            })
        elif overall_pct < 0:
            insights.append({
                "id": "overall_expense_trend",
                "prefix": "Your overall spending is ",
                "highlight": f"{abs(overall_pct)}% lower",
                "suffix": " than last month.",
                "type": "income",
                "direction": "down"
            })

    # 2. Savings rate this month
    if curr_income > 0:
        savings = curr_income - curr_expense
        savings_rate = round((savings / curr_income) * 100)
        if savings_rate >= 0:
            insights.append({
                "id": "savings_rate",
                "prefix": "Savings rate this month: ",
                "highlight": f"{min(100, savings_rate)}%",
                "suffix": ".",
                "type": "income" if savings_rate >= 20 else "neutral",
                "direction": "up" if savings_rate >= 20 else None
            })
        else:
            insights.append({
                "id": "savings_rate",
                "prefix": "Expenses exceeded revenue by ",
                "highlight": f"{abs(savings_rate)}%",
                "suffix": " this month.",
                "type": "expense",
                "direction": "down"
            })

    # 3. Biggest expense category this month
    if curr_cat_expenses:
        top_cat, top_amt = max(curr_cat_expenses.items(), key=lambda x: x[1])
        if top_amt > 0:
            insights.append({
                "id": "biggest_expense",
                "prefix": f"Your biggest expense category is {top_cat} (",
                "highlight": f"₹{top_amt:,.0f}",
                "suffix": ").",
                "type": "expense",
                "direction": None
            })

    # 4. Budget adherence
    budgets = Budget.query.filter_by(user_id=current_user_id).all()
    if budgets:
        total_budgets = len(budgets)
        under_count = sum(
            1 for b in budgets
            if curr_cat_expenses.get(b.category.strip().title(), 0.0) <= float(b.monthly_limit or 0)
        )
        is_all_under = under_count == total_budgets
        insights.append({
            "id": "budget_status",
            "prefix": "You're on track to stay under budget in ",
            "highlight": f"{under_count} of {total_budgets}",
            "suffix": " categories.",
            "type": "income" if is_all_under else ("expense" if under_count < total_budgets / 2 else "neutral"),
            "direction": "up" if is_all_under else None
        })
    elif len(insights) < 3 and curr_expense > 0:
        days_passed = max(1, now.day)
        daily_avg = curr_expense / days_passed
        insights.append({
            "id": "daily_avg",
            "prefix": "Average daily expenditure this month: ",
            "highlight": f"₹{daily_avg:,.0f}",
            "suffix": f" (across {days_passed} day{'s' if days_passed > 1 else ''}).",
            "type": "neutral",
            "direction": None
        })

    return jsonify({
        "insights": insights[:4],
        "has_data": len(insights) > 0,
        "month_name": now.strftime("%B %Y")
    })