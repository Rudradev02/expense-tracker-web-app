# Expense Tracker

## Overview

This project is a React/Vite frontend with a Flask/SQLAlchemy backend. The backend uses the Replit-provided PostgreSQL connection when `DATABASE_URL` is available and otherwise falls back to SQLite.

## Running on Replit

Use the `Start application` workflow. It serves the frontend on port 5000 and runs Flask privately on port 5001. Vite proxies API requests to Flask.

The development workflow uses the existing Node and Python dependencies from `package.json` and `backend/requirements.txt`. JWT signing uses `SECRET_KEY` when configured, with the existing `SESSION_SECRET` as the Replit fallback.

## User preferences

- Keep the existing React + Flask structure.
- Prefer small, targeted fixes over migrations or broad refactors.