# Deployment Guide: Expense Tracker Web App

This guide outlines how to deploy the **Expense Tracker** application to production using **Vercel** for the React frontend and **Render** (or **Railway**) for the Python Flask backend & PostgreSQL database.

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────┐
│     Vercel (Global Edge CDN)    │
│  React 19 + Vite + Tailwind PWA │
│    https://yourapp.vercel.app   │
└────────────────┬────────────────┘
                 │
                 │ HTTPS REST API requests (Bearer Token / Cookie)
                 ▼
┌─────────────────────────────────┐
│     Render (Python Web Service) │
│       Flask + Gunicorn WSGI     │
│   https://yourapi.onrender.com  │
└────────────────┬────────────────┘
                 │
                 │ PostgreSQL connection
                 ▼
┌─────────────────────────────────┐
│  Render Postgres / Neon DB      │
│  Persistent Cloud Database      │
└─────────────────────────────────┘
```

---

## 🚀 Part 1: Deploy the Backend & Database (Render)

### Option A: 1-Click Render Blueprint (Recommended)

1. Push your latest code to your **GitHub** repository.
2. Log in to [Render.com](https://render.com).
3. Click **New +** in the top navigation and select **Blueprint**.
4. Connect your GitHub repository.
5. Render reads the included [render.yaml](file:///e:/AI-Workspace/projects/expense-tracker-web-app/render.yaml) and automatically creates:
   - A free managed **PostgreSQL database** (`expense-tracker-db`).
   - A free **Python Web Service** (`expense-tracker-api`) with Gunicorn.
   - Automatically wires the `DATABASE_URL` between them.
6. Click **Apply**.
7. Once deployed, copy your backend URL (e.g. `https://expense-tracker-api.onrender.com`).

---

### Option B: Manual Setup on Render

#### 1. Create PostgreSQL Database
1. On Render, click **New +** -> **PostgreSQL**.
2. Name: `expense-tracker-db`.
3. Plan: **Free**.
4. Click **Create Database**.
5. Once created, copy the **Internal Database URL** (or External Database URL).

#### 2. Create Backend Web Service
1. On Render, click **New +** -> **Web Service**.
2. Connect your GitHub repository.
3. Configure the following fields (**Important**):
   - **Name**: `expense-tracker-api`
   - **Root Directory**: `backend` *(Do not leave blank)*
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt` *(Replace Render's default `uv sync` command)*
   - **Start Command**: `gunicorn app:app`
   - **Plan**: `Free`
4. In **Environment Variables**, add:
   - `PYTHON_VERSION`: `3.11.9` *(Ensures stable Python instead of 3.14)*
   - `DATABASE_URL`: *(Paste your PostgreSQL URL from step 1)*
   - `SECRET_KEY`: *(Enter a secure random string, e.g. run `openssl rand -hex 32`)*
   - `FLASK_ENV`: `production`
   - `FRONTEND_URL`: `*` *(or your Vercel URL once deployed)*
5. Click **Create Web Service** (or **Save Changes** in Settings if already created).
6. When deployment finishes, visit `https://<your-backend-service>.onrender.com/` in your browser. You should see:
   ```json
   {
     "message": "Expense Tracker API is running",
     "database": "PostgreSQL"
   }
   ```

---

## ⚡ Part 2: Deploy the Frontend (Vercel)

1. Log in to [Vercel.com](https://vercel.com).
2. Click **Add New...** -> **Project**.
3. Import your GitHub repository.
4. Configure Project Settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click *Edit* and select `frontend` (or keep `./` as root, since root [vercel.json](file:///e:/AI-Workspace/projects/expense-tracker-web-app/vercel.json) handles monorepo build).
5. Open **Environment Variables** and add:
   - **Key**: `VITE_API_URL`
   - **Value**: `https://<your-backend-service>.onrender.com` *(your live Render backend URL, without trailing slash)*
6. Click **Deploy**.
7. In ~60 seconds, your site is live with HTTPS and full PWA support!

---

## 🔗 Part 3: Final Link & CORS Configuration

1. Copy your live Vercel URL (e.g. `https://expense-tracker.vercel.app`).
2. Go back to your backend on **Render** -> **Environment**.
3. Add or update the environment variable:
   - **Key**: `FRONTEND_URL`
   - **Value**: `https://expense-tracker.vercel.app`
4. Render will automatically redeploy to apply the CORS origin setting.

---

## ✅ Production Verification Checklist

- [ ] **Health Check**: Open `https://<your-backend>.onrender.com/` -> verifies database connection.
- [ ] **Registration**: Open Vercel app, register a new account -> creates sample categories and logs in.
- [ ] **Add Transaction**: Create a transaction in INR or USD -> verifies exchange rate conversion.
- [ ] **Insights Card**: Check that dashboard monthly insights calculate and update when switching currencies.
- [ ] **PWA Install**: Visit site on mobile or Chromium browser -> "Install App" button appears and offline caching activates.
