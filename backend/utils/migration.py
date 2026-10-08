import os
import bcrypt
from sqlalchemy import text, inspect
from config import db
from models import User, Category, Transaction, Budget, RecurringRule

DEFAULT_CATEGORIES = [
    "Food",
    "Salary",
    "Transport",
    "Shopping",
    "Bills"
]


def run_data_migration(app):
    """
    Ensures users table exists, adds user_id to category table,
    assigns any orphaned data to a default user, and seeds default
    categories per user.
    """
    with app.app_context():
        # 1. Ensure all tables are created
        db.create_all()

        # 1b. Immediately ensure multi-currency columns exist before querying models
        try:
            with db.engine.connect() as conn:
                conn.execute(text('ALTER TABLE "user" ADD COLUMN IF NOT EXISTS base_currency VARCHAR(3) DEFAULT \'INR\';'))
                conn.execute(text('ALTER TABLE "transaction" ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT \'INR\';'))
                conn.execute(text('ALTER TABLE "transaction" ADD COLUMN IF NOT EXISTS original_amount FLOAT;'))
                conn.execute(text('ALTER TABLE "transaction" ADD COLUMN IF NOT EXISTS exchange_rate FLOAT DEFAULT 1.0;'))
                conn.commit()
        except Exception as e:
            app.logger.info(f"Early column addition note: {e}")

        # 2. Ensure default user exists
        default_user = User.query.filter_by(username="default_user").first()
        if not default_user:
            first_existing_user = User.query.order_by(User.id).first()
            if first_existing_user:
                default_user = first_existing_user
            else:
                default_pw = os.environ.get("DEFAULT_USER_PASSWORD", "DefaultPass123!")
                hashed = bcrypt.hashpw(default_pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
                default_user = User(
                    username="default_user",
                    email="default@expensetracker.local",
                    password=hashed
                )
                db.session.add(default_user)
                db.session.commit()
                app.logger.info(f"Created default user with id {default_user.id}")

        default_id = default_user.id

        # 3. Add user_id to category table if not present
        try:
            inspector = inspect(db.engine)
            category_cols = [c["name"] for c in inspector.get_columns("category")]
            if "user_id" not in category_cols:
                with db.engine.connect() as conn:
                    conn.execute(text('ALTER TABLE "category" ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES "user"(id) ON DELETE CASCADE;'))
                    conn.commit()
                app.logger.info("Added user_id column to category table.")
        except Exception as e:
            app.logger.info(f"Column check notice: {e}")

        # 4. Remove global unique constraint on category name so categories are scoped per-user
        try:
            with db.engine.connect() as conn:
                conn.execute(text('ALTER TABLE "category" DROP CONSTRAINT IF EXISTS category_name_key;'))
                conn.commit()
        except Exception as e:
            app.logger.info(f"Drop constraint notice: {e}")

        # 5. Backfill existing orphaned records with default_id
        try:
            with db.engine.connect() as conn:
                conn.execute(text(f'UPDATE "category" SET user_id = {default_id} WHERE user_id IS NULL;'))
                conn.execute(text(f'UPDATE "transaction" SET user_id = {default_id} WHERE user_id IS NULL;'))
                conn.execute(text(f'UPDATE "budget" SET user_id = {default_id} WHERE user_id IS NULL;'))
                try:
                    conn.execute(text(f'UPDATE "recurring_rules" SET user_id = {default_id} WHERE user_id IS NULL;'))
                except Exception:
                    pass
                conn.commit()
        except Exception as e:
            app.logger.info(f"Backfill note: {e}")

        # 6. Ensure default categories exist for each registered user
        try:
            users = User.query.all()
            for u in users:
                user_cats = Category.query.filter_by(user_id=u.id).count()
                if user_cats == 0:
                    for name in DEFAULT_CATEGORIES:
                        db.session.add(Category(name=name, user_id=u.id))
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            app.logger.info(f"Category seeding note: {e}")

        # 7. Multi-currency columns migration and backfill
        try:
            with db.engine.connect() as conn:
                # Add base_currency to user table
                conn.execute(text('ALTER TABLE "user" ADD COLUMN IF NOT EXISTS base_currency VARCHAR(3) DEFAULT \'INR\';'))
                # Add currency, original_amount, exchange_rate to transaction table
                conn.execute(text('ALTER TABLE "transaction" ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT \'INR\';'))
                conn.execute(text('ALTER TABLE "transaction" ADD COLUMN IF NOT EXISTS original_amount FLOAT;'))
                conn.execute(text('ALTER TABLE "transaction" ADD COLUMN IF NOT EXISTS exchange_rate FLOAT DEFAULT 1.0;'))

                # Backfill existing data
                conn.execute(text("UPDATE \"user\" SET base_currency = 'INR' WHERE base_currency IS NULL;"))
                conn.execute(text("UPDATE \"transaction\" SET currency = 'INR' WHERE currency IS NULL;"))
                conn.execute(text("UPDATE \"transaction\" SET exchange_rate = 1.0 WHERE exchange_rate IS NULL;"))
                conn.execute(text("UPDATE \"transaction\" SET original_amount = amount WHERE original_amount IS NULL;"))
                conn.commit()
            app.logger.info("Multi-currency schema migration and backfill completed successfully.")
        except Exception as e:
            app.logger.info(f"Multi-currency migration note: {e}")


def seed_categories_for_user(user_id):
    """
    Seeds standard baseline categories for a newly registered user.
    """
    for name in DEFAULT_CATEGORIES:
        existing = Category.query.filter_by(user_id=user_id, name=name).first()
        if not existing:
            db.session.add(Category(name=name, user_id=user_id))
    db.session.commit()
