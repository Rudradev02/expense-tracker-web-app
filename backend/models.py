from datetime import datetime, date
from config import db


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)

    transactions = db.relationship(
        "Transaction",
        backref="user",
        lazy=True,
        cascade="all, delete-orphan"
    )

    budgets = db.relationship(
        "Budget",
        backref="user",
        lazy=True,
        cascade="all, delete-orphan"
    )

    recurring_rules = db.relationship(
        "RecurringRule",
        backref="user",
        lazy=True,
        cascade="all, delete-orphan"
    )

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email
        }


class Category(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name
        }


class Transaction(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    category = db.Column(db.String(50), nullable=False)
    type = db.Column(db.String(10), nullable=False)
    date = db.Column(db.DateTime, default=datetime.utcnow)

    # Link transaction to a user
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("user.id"),
        nullable=False
    )

    # Optional link to recurring rule
    recurring_rule_id = db.Column(
        db.Integer,
        db.ForeignKey("recurring_rules.id", ondelete="SET NULL"),
        nullable=True
    )

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "amount": self.amount,
            "category": self.category,
            "type": self.type,
            "date": self.date.isoformat() if self.date else None,
            "user_id": self.user_id,
            "recurring_rule_id": self.recurring_rule_id,
            "is_recurring": bool(self.recurring_rule_id),
        }



class Budget(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    category = db.Column(db.String(50), nullable=False)
    monthly_limit = db.Column(db.Float, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Link budget to a user
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("user.id"),
        nullable=False
    )

    __table_args__ = (
        db.UniqueConstraint("user_id", "category", name="uq_user_category_budget"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "category": self.category,
            "monthly_limit": self.monthly_limit,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "user_id": self.user_id
        }


class RecurringRule(db.Model):
    __tablename__ = "recurring_rules"

    id = db.Column(db.Integer, primary_key=True)
    description = db.Column(db.String(255), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    type = db.Column(db.String(10), nullable=False)  # 'income' or 'expense'
    category = db.Column(db.String(50), nullable=False)
    frequency = db.Column(db.String(20), nullable=False)  # 'daily', 'weekly', 'monthly', 'yearly'
    start_date = db.Column(db.Date, nullable=False, default=date.today)
    end_date = db.Column(db.Date, nullable=True)
    next_run_date = db.Column(db.Date, nullable=False, default=date.today)
    active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Link recurring rule to a user
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("user.id"),
        nullable=False
    )

    transactions = db.relationship(
        "Transaction",
        backref="recurring_rule",
        lazy=True
    )

    def to_dict(self):
        return {
            "id": self.id,
            "description": self.description,
            "amount": self.amount,
            "type": self.type,
            "category": self.category,
            "frequency": self.frequency,
            "start_date": self.start_date.isoformat() if self.start_date else None,
            "end_date": self.end_date.isoformat() if self.end_date else None,
            "next_run_date": self.next_run_date.isoformat() if self.next_run_date else None,
            "active": self.active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "user_id": self.user_id
        }