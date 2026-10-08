from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
from config import db
from routes.transaction_routes import transaction_bp
from routes.category_routes import category_bp
from routes.auth_routes import auth_bp
from routes.budget_routes import budget_bp
from routes.recurring_routes import recurring_bp
from utils.recurring_processor import process_due_recurring_rules, start_recurring_scheduler
import os

# Load environment variables
load_dotenv()

# Create Flask app
app = Flask(__name__)
CORS(app)

# Database configuration
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get(
    "DATABASE_URL",
    "sqlite:///database.db"
)
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
# Reconnect stale Neon/PostgreSQL SSL connections automatically
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_pre_ping": True,
    "pool_recycle": 280,
}

# Initialize database
db.init_app(app)

# Register blueprints
app.register_blueprint(transaction_bp)
app.register_blueprint(category_bp)
app.register_blueprint(auth_bp)
app.register_blueprint(budget_bp)
app.register_blueprint(recurring_bp)

# Default categories
DEFAULT_CATEGORIES = [
    "Food",
    "Salary",
    "Transport",
    "Shopping",
    "Bills"
]

# Create tables and add default categories
with app.app_context():
    from models import Transaction, Category, Budget, RecurringRule

    # Create tables if they don't exist
    db.create_all()

    # Safe schema migration: ensure recurring_rule_id column exists on transaction table
    try:
        from sqlalchemy import text
        with db.engine.connect() as conn:
            conn.execute(text('ALTER TABLE "transaction" ADD COLUMN IF NOT EXISTS recurring_rule_id INTEGER REFERENCES "recurring_rules"(id) ON DELETE SET NULL;'))
            conn.commit()
    except Exception as e:
        app.logger.info(f"Schema migration note: {e}")

    # Add default categories only once
    if Category.query.count() == 0:
        for name in DEFAULT_CATEGORIES:
            db.session.add(Category(name=name))
        db.session.commit()

    # Process due recurring transactions on startup
    try:
        process_due_recurring_rules()
    except Exception as e:
        app.logger.warning(f"Initial recurring check note: {e}")

# Start scheduled background job (every 5 minutes)
start_recurring_scheduler(app, interval_seconds=300)



# Health check route
@app.route("/")
def home():
    return {
        "message": "Expense Tracker API is running",
        "database": "PostgreSQL"
    }


# Run app locally
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=True, host="127.0.0.1", port=port)