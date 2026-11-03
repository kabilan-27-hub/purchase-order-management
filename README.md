# Supplier and Purchase Order Management System

This monorepo contains the source code, infrastructure, and documentation for a supplier and purchase order management system built with React, FastAPI, PostgreSQL, Terraform, and GitHub Actions.

## Quick start

1. Start PostgreSQL:
   `docker compose up -d postgres`
2. Copy backend environment example:
   `cp backend/.env.example backend/.env`
3. Install backend dependencies:
   `cd backend && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt`
4. Run migrations or create tables:
   `python -m app.main` (startup creates tables automatically)
5. Start the API:
   `uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`
6. Install frontend dependencies and run the app:
   `cd frontend && npm install && cp .env.example .env && npm run dev`

## Default login

Email: admin@supplier.local
Password: admin123

## Git commands

```bash
git init
git add .
git commit -m "Initial supplier management application"
git branch -M main
git remote add origin YOUR_GITHUB_REPOSITORY_URL
git push -u origin main
```
