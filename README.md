# 💰 Expense Tracker Web App

A full-stack expense management application that helps users track their income and expenses, organize transactions, and understand their spending through a clean and responsive dashboard.

## 🚀 Features

* 📊 Dashboard with financial overview
* 💵 Add and manage income
* 💸 Add and manage expenses
* 🏷️ Categorize transactions
* 📅 Track financial activity
* 📈 Visualize spending and income
* 🔍 View and manage transaction history
* 📱 Responsive user interface
* 💾 Persistent database storage
* 🔐 Backend API for application data

## 🛠️ Tech Stack

### Frontend

* React
* Vite
* Tailwind CSS
* JavaScript

### Backend

* Python
* Flask
* Flask-SQLAlchemy

### Database

* PostgreSQL
* SQLite

### Tools

* Git
* GitHub
* VS Code

## 🏗️ Project Architecture

```text
expense-tracker-web-app/
│
├── frontend/
│   ├── src/
│   ├── components/
│   ├── pages/
│   └── ...
│
├── backend/
│   ├── routes/
│   ├── models/
│   ├── database/
│   └── ...
│
├── README.md
└── ...
```

> The exact folder structure may vary depending on the current project version.

## ⚙️ Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/Rudradev02/expense-tracker-web-app.git
cd expense-tracker-web-app
```

### 2. Backend Setup

Create and activate a Python virtual environment:

```bash
python -m venv venv
```

Windows:

```bash
venv\Scripts\activate
```

Install the dependencies:

```bash
pip install -r requirements.txt
```

Configure your environment variables using a `.env` file.

Example:

```env
DATABASE_URL=your_database_url
SECRET_KEY=your_secret_key
```

Start the Flask backend:

```bash
python app.py
```

### 3. Frontend Setup

Open a new terminal and move to the frontend directory:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open the local URL displayed by Vite in your browser.

## 📊 Main Modules

### Dashboard

Provides a quick overview of income, expenses, balance, and recent transactions.

### Income Management

Allows users to record and manage their income sources.

### Expense Management

Allows users to add, edit, delete, and organize expenses.

### Transaction History

Displays financial transactions in an organized format for easier tracking.

### Categories

Helps users organize expenses and analyze where their money is being spent.

## 🎯 Project Goals

This project was built to practice full-stack web development and understand how a modern frontend communicates with a Python backend and database.

The project focuses on:

* REST API development
* Database management
* React component architecture
* Frontend and backend integration
* CRUD operations
* Responsive UI development
* Real-world application design

## 🔮 Future Improvements

* User authentication and authorization
* Monthly and yearly financial reports
* Export transactions to CSV/PDF
* Advanced spending analytics
* Budget management
* Recurring transactions
* Dark mode
* Deployment with production database

## 👨‍💻 Author

**Rudra Kumbhani**

GitHub: [@Rudradev02](https://github.com/Rudradev02)

---

⭐ If you find this project useful, consider giving it a star!
