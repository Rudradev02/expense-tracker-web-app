import calendar
import threading
import time
from datetime import datetime, date, timedelta
from config import db
from models import RecurringRule, Transaction


def compute_next_run_date(current_date, frequency, anchor_day=None):
    """
    Advance date according to frequency, handling month-end edge cases.
    anchor_day: original day of month (e.g. 31) from start_date to preserve
    when transitioning between months of varying lengths (Jan 31 -> Feb 28 -> Mar 31).
    """
    if isinstance(current_date, str):
        current_date = datetime.strptime(current_date[:10], "%Y-%m-%d").date()
    elif isinstance(current_date, datetime):
        current_date = current_date.date()

    if anchor_day is None:
        anchor_day = current_date.day

    freq = (frequency or "monthly").lower().strip()

    if freq == "daily":
        return current_date + timedelta(days=1)

    elif freq == "weekly":
        return current_date + timedelta(weeks=1)

    elif freq == "monthly":
        year = current_date.year
        month = current_date.month + 1
        if month > 12:
            month = 1
            year += 1
        _, max_days = calendar.monthrange(year, month)
        target_day = min(anchor_day, max_days)
        return date(year, month, target_day)

    elif freq == "yearly":
        year = current_date.year + 1
        month = current_date.month
        _, max_days = calendar.monthrange(year, month)
        target_day = min(anchor_day, max_days)
        return date(year, month, target_day)

    else:
        # Default monthly fallback
        year = current_date.year
        month = current_date.month + 1
        if month > 12:
            month = 1
            year += 1
        _, max_days = calendar.monthrange(year, month)
        target_day = min(anchor_day, max_days)
        return date(year, month, target_day)


def process_due_recurring_rules(user_id=None):
    """
    Find active recurring rules whose next_run_date is due (<= today).
    Creates due transactions idempotently and advances next_run_date.
    Returns the count of transactions newly generated.
    """
    today = datetime.utcnow().date()
    query = RecurringRule.query.filter_by(active=True)
    if user_id is not None:
        query = query.filter_by(user_id=user_id)

    rules = query.filter(RecurringRule.next_run_date <= today).all()
    created_count = 0

    for rule in rules:
        iterations = 0
        max_iterations = 60  # Safety cap against runaway schedules

        while rule.active and rule.next_run_date <= today and iterations < max_iterations:
            iterations += 1

            # End date check
            if rule.end_date and rule.next_run_date > rule.end_date:
                rule.active = False
                break

            run_date = rule.next_run_date
            run_date_dt = datetime.combine(run_date, datetime.min.time())
            next_day_dt = run_date_dt + timedelta(days=1)

            # Idempotency check: has a transaction already been created for this rule on this run date?
            existing_tx = Transaction.query.filter(
                Transaction.user_id == rule.user_id,
                Transaction.recurring_rule_id == rule.id,
                Transaction.date >= run_date_dt,
                Transaction.date < next_day_dt
            ).first()

            if not existing_tx:
                new_tx = Transaction(
                    title=rule.description,
                    amount=rule.amount,
                    type=rule.type,
                    category=rule.category,
                    date=run_date_dt,
                    user_id=rule.user_id,
                    recurring_rule_id=rule.id
                )
                db.session.add(new_tx)
                created_count += 1

            # Advance next_run_date, preserving the original anchor day
            anchor_day = rule.start_date.day if rule.start_date else run_date.day
            next_run = compute_next_run_date(run_date, rule.frequency, anchor_day)
            rule.next_run_date = next_run

            # Check if advanced beyond end_date
            if rule.end_date and rule.next_run_date > rule.end_date:
                rule.active = False
                break

        try:
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            print(f"Error processing recurring rule {rule.id}: {e}")

    return created_count


def start_recurring_scheduler(app, interval_seconds=300):
    """
    Start background daemon scheduler that runs process_due_recurring_rules periodically.
    """
    def run_worker():
        while True:
            time.sleep(interval_seconds)
            try:
                with app.app_context():
                    process_due_recurring_rules()
            except Exception as e:
                print(f"Background recurring transactions worker error: {e}")

    worker_thread = threading.Thread(
        target=run_worker,
        daemon=True,
        name="RecurringTransactionsWorker"
    )
    worker_thread.start()
    return worker_thread
