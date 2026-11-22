# Expense Tracker

A learning project for tracking personal expenses. Add, edit, and delete expenses, filter them by category, and see category totals and the grand total.

The backend uses FastAPI, SQLAlchemy, and SQLite. The frontend uses React 19, Vite, HeroUI v3, and Tailwind CSS v4.

## Quick start

Requires Python 3.11+ and Node.js with npm. Supported Node.js versions are 22.12 or later in the 22.x series, 24.x, and 26+.

Start the backend from the repository root.

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

In Windows PowerShell, use `py -m venv .venv` to create the virtual environment and `.\.venv\Scripts\Activate.ps1` to activate it.

In a second terminal, start the frontend from the repository root.

```bash
cd frontend
npm install
npm run dev
```

Open the [app](http://localhost:5173) or the [API docs](http://localhost:8000/docs).

By default, the backend creates `backend/expenses.db` on first startup. To change the settings, copy [.env.example](.env.example) to `.env` in the repository root.

For demo data, run `python seed.py` from `backend/` with the virtual environment active. This deletes all expenses in the configured database and adds 10 sample entries.

## Checks

| Directory | Commands |
| --- | --- |
| `backend/` with the virtual environment active | `ruff check .`, `pytest -q` |
| `frontend/` | `npm run lint`, `npm test`, `npm run build` |
