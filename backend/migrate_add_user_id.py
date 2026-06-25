"""
One-time migration script: adds user_id column to transaction table in Neon PostgreSQL
Run with: venv\Scripts\python migrate_add_user_id.py
"""
from app import app, db
from sqlalchemy import text

with app.app_context():
    with db.engine.connect() as conn:
        # Check if user_id column already exists
        result = conn.execute(text("""
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'transaction' AND column_name = 'user_id'
        """))
        exists = result.fetchone()

        if exists:
            print("user_id column already exists — no action needed.")
        else:
            # Add user_id column (nullable first so existing rows are safe)
            conn.execute(text('ALTER TABLE "transaction" ADD COLUMN user_id INTEGER'))
            conn.execute(text('ALTER TABLE "transaction" ADD CONSTRAINT fk_transaction_user FOREIGN KEY (user_id) REFERENCES "user"(id)'))
            conn.commit()
            print("user_id column added successfully.")
