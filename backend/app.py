from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
from config import db
from routes.transaction_routes import transaction_bp
from routes.category_routes import category_bp
from routes.auth_routes import auth_bp
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
    from models import Transaction, Category

    # Create tables if they don't exist
    db.create_all()

    # Add default categories only once
    if Category.query.count() == 0:
        for name in DEFAULT_CATEGORIES:
            db.session.add(Category(name=name))
        db.session.commit()


# Health check route
@app.route("/")
def home():
    return {
        "message": "Expense Tracker API is running",
        "database": "PostgreSQL"
    }


# Run app locally
if __name__ == "__main__":
    app.run(debug=True)