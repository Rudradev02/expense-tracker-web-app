from flask import Flask
from flask_cors import CORS
from config import db
from routes.transaction_routes import transaction_bp

app = Flask(__name__)
CORS(app)

app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///database.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db.init_app(app)

app.register_blueprint(transaction_bp)

with app.app_context():
    from models import Transaction
    db.create_all()

    if Transaction.query.count() == 0:
        sample1 = Transaction(
            title="Pizza",
            amount=250,
            category="Food",
            type="expense"
        )

        sample2 = Transaction(
            title="Salary",
            amount=50000,
            category="Salary",
            type="income"
        )

        db.session.add(sample1)
        db.session.add(sample2)
        db.session.commit()

@app.route("/")
def home():
    return {"message": "Expense Tracker API is running"}

if __name__ == "__main__":
    app.run(debug=True)