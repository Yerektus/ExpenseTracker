# Task 02 — Code-based implementation: budget check

- Branch: `feature/budget-check` (from `3c44b66`). Contract: `task-01/requirements.md` §2.
- Agent: Claude Code, model Claude Opus 5.5 (`claude-opus-5-5`), working in the repository under AGENTS.md.
- Approval recorded before the change (AGENTS.md §8 "API contract changes"): the student chose the
  feature *Budget check* with a new read-only endpoint `GET /api/budget-check` on 2026-11-27.
  No DB schema change, no new dependencies, no CORS change.

## 1. Architecture and workflow

```
BudgetCheck.jsx (form, validateBudgetInput, result card)
   │ onCheck(values)                       ▲ result / error / isChecking (props)
   ▼                                       │
App.jsx: handleBudgetCheck → budgetQuery ──useEffect[budgetQuery, reloadCount]──> api.fetchBudgetCheck()
   ──HTTP GET /api/budget-check?month=&category=&limit=──> routers/expenses.py: read_budget_check()
   ──> schemas.BudgetCheckQuery (validation, 422 on bad input)
   ──> crud.get_budget_check() ──> list_expenses_in_month() (SQL: category + first..last day)
                               ──> calculate_budget_check() (pure: sum, remaining, %, status)
   <── schemas.BudgetCheck (response model)
```

| Concern | Where | Notes |
|---|---|---|
| Input validation (authoritative) | `backend/app/schemas.py` → `BudgetCheckQuery` | month regex, `Category` enum, `0.01 ≤ limit ≤ 1 000 000`, whole cents, unknown query params rejected (`extra="forbid"`) |
| Input validation (UX only) | `frontend/src/components/BudgetCheck.jsx` → `validateBudgetInput()` | same rules, Russian messages at the fields; no request is sent for invalid input |
| Core logic | `backend/app/crud.py` → `calculate_budget_check()` (pure), `month_bounds()`, `list_expenses_in_month()` | status thresholds compared in whole cents |
| HTTP | `backend/app/routers/expenses.py` → `GET /api/budget-check`; `frontend/src/api.js` → `fetchBudgetCheck()` | read-only, `POST`/`DELETE` → 405 |
| Page state / side effects | `frontend/src/App.jsx` | query, result, error, pending; re-runs after every data reload |
| User-facing output | `BudgetCheck.jsx` result card; `categories.js` → `formatPercent()` | Chip + Meter coloured by status (success / warning / danger tokens), works in dark mode |

## 2. Build and run

```bash
# backend (terminal 1, from the repository root)
cd backend && source .venv/bin/activate
uvicorn app.main:app --reload            # or with DATABASE_URL=sqlite:////tmp/budget-demo.db for a throwaway DB
# demo data without touching the real DB (only POSTs, deletes nothing):
python ../docs/assignment-06/demo/load_fixture.py http://localhost:8000

# frontend (terminal 2)
cd frontend && npm install && npm run dev  # http://localhost:5173 → card «Проверка бюджета» under «Сводка»

# API directly
curl 'http://localhost:8000/api/budget-check?month=2025-03&category=food&limit=100'

# checks (AGENTS.md §6)
cd backend && ruff check . && pytest -q
cd frontend && npm run lint && npm test && npm run build
```

Demo evidence: `screenshots/app-light.png`, `app-dark.png`, `card-light.png`, `card-dark.png` (TC02 input, real
backend, throwaway DB), recorded by `screenshots/ui-run-demo.png`.

## 3. Files changed

| File | Change |
|---|---|
| `backend/app/schemas.py` | `BudgetStatus`, `BudgetCheckQuery` (+ whole-cents validator), `BudgetCheck` |
| `backend/app/crud.py` | `BUDGET_WARNING_PERCENT`, `month_bounds()`, `list_expenses_in_month()`, `calculate_budget_check()`, `get_budget_check()` |
| `backend/app/routers/expenses.py` | `GET /api/budget-check` with `Annotated[BudgetCheckQuery, Query()]` |
| `backend/tests/test_expenses.py` | 22 new test cases (fixture, boundaries, invalid input, read-only/repeat, pure-function tests) |
| `frontend/src/components/BudgetCheck.jsx` | new component |
| `frontend/src/App.jsx` | budget query/result state and effect; card placed under «Сводка» |
| `frontend/src/api.js`, `categories.js` | `fetchBudgetCheck()`, `formatPercent()` |
| `frontend/eslint.config.js` | `URLSearchParams` added to the hand-written globals (AGENTS.md §5 rule) |
| `frontend/src/__tests__/BudgetCheck.test.jsx`, `BudgetCheckApp.test.jsx` | new tests (6 + 3) |
| `frontend/src/__tests__/App.test.jsx`, `ExpenseActions.test.jsx` | `fetchBudgetCheck: vi.fn()` added to the `api.js` mock (no assertion changed) |
| `AGENTS.md` | structure, data flow and baselines updated (HeroUI block byte-identical) |

## 4. Decisions and substantive edits

Decisions taken by the human (student): the feature and its API addition, the low-code platform, using nvm
instead of downloading Node, the docs layout. Decisions proposed by the agent and kept: month as a text field
`ГГГГ-ММ` (React Aria has no month-only date field, and a text field gives identical input in Appsmith);
thresholds compared in whole cents; the endpoint is read-only and validated by a Pydantic query model; the month
regex starts with `[1-9]` (not `\d{4}`) from the first version, because `0000-01` would reach
`datetime.date(0, 1, 1)` → `ValueError: year must be in 1..9999, not 0` (checked) → HTTP 500.

Substantive edits after the first version (all verified by tests, see task-05):

| Edit | Why |
|---|---|
| `api.js` mock extended in two existing test files | first `npm test` after wiring the card: 6 tests failed with `No "fetchBudgetCheck" export is defined on the "../api.js" mock` |
| New component test renders inside `I18nProvider locale="ru-RU"` | `79,99` was parsed as `7999` without the provider (en-US grouping comma); the app itself always runs in ru-RU (`main.jsx`) |
| Limit `≥ 0.01` and whole cents (review F1/F2) | limits below a cent gave a wrong status, `-0,00` and `percent_used: null` |
| Budget state moved from `BudgetCheck.jsx` to `App.jsx`, re-run on `reloadCount` (review F3) | the card kept stale numbers after an expense was added; also matches AGENTS.md §5 "state lives in App.jsx" |

## 5. Tests added

Backend (`backend/tests/test_expenses.py`, 8 → 30 tests): `test_budget_check_counts_only_category_and_month`,
`test_budget_check_boundaries` (7 cases: 80 %, 100 %, just over, month edges, empty month, max limit, 0.01),
`test_budget_check_rejects_invalid_input` (11 cases incl. `0000-01`, unknown category, `0.004`, `79.996`, `1e-310`),
`test_budget_check_is_read_only_and_repeatable`, `test_month_bounds_handles_month_lengths`,
`test_calculate_budget_check_thresholds_ignore_float_noise`.

Frontend (8 → 17 tests): `BudgetCheck.test.jsx` — submit passes values, result rendering (warning, over), field
errors without a request, error alert, `validateBudgetInput` boundaries; `BudgetCheckApp.test.jsx` — recompute
after adding an expense, server error keeps input and removes the old result, repeated check hits the server.
