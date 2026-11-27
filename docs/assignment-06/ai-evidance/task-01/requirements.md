# Task 01 — Baseline and requirements: monthly budget check

- Student: Yerentalov Yerdos, group: saturday 9:00-12:00
- Assignment: Software Engineering — Assignment #06
- Application: Expense Tracker (FastAPI + SQLite backend, React 19 + HeroUI v3 frontend)
- Starting version: commit `3c44b66` (branch `refactor/summary-categories-from-server`, the final version of Assignment #05).
  Work for Assignment #06 is done on branch `feature/budget-check`, created from `3c44b66`.

## 1. User, problem, feature and scope

**User.** A student who records daily personal expenses in the Expense Tracker and lives on a fixed
monthly allowance split into category budgets (for example, 25 000 for food).

**Problem.** The app shows only all-time totals per category. To find out whether this month's food
spending is still within the budget, the user has to filter the list, add the amounts of the right
month by hand and compare the sum with the limit. This is slow and error-prone, especially at the
month boundaries (the last day of the previous month must not be counted).

**Feature.** "Budget check" (Проверка бюджета). The user enters a month (`YYYY-MM`), chooses a
category and types a budget limit. The app answers how much was spent in that category during that
calendar month, how much of the limit remains, what percentage of the limit is used, and a status:
*within budget*, *close to the limit* (80 % or more) or *over budget*.

**Scope.** In scope: one read-only calculation over existing expenses, input validation with
field-level messages, a clear error message when the server is unavailable. Out of scope: storing
budgets, notifications, multiple categories at once, currencies, authentication. The check never
creates, changes or deletes expenses. Only fictional sample data is used.

*(Word count of this section: 206.)*

## 2. Feature contract (identical in both implementations)

### Inputs

| Input | Type / format | Rule | Error message (UI) |
|---|---|---|---|
| `month` | text `YYYY-MM` | year 1000–9999, month `01`–`12` (regex `^[1-9]\d{3}-(0[1-9]\|1[0-2])$`) | «Укажите месяц в формате ГГГГ-ММ» |
| `category` | one of `food`, `transport`, `entertainment`, `utilities`, `other` | must be a known category | — (the UI offers only a fixed list; the API answers 422 with the Pydantic message «Input should be 'food', 'transport', …») |
| `limit` | number | `0.01 ≤ limit ≤ 1 000 000`, whole cents (at most 2 decimals)¹ | «Лимит должен быть больше 0 и не больше 1 000 000» |

¹ The first version of the contract said `0 < limit`. The agentic review (task-05, findings F1/F2) showed that a
limit below one cent or with fractions of a cent gives a wrong status, `-0,00` or an infinite percentage, so the
rule was tightened in both implementations. In the React UI the limit field already accepts at most 2 decimals,
so the visible error message did not change. All test cases below are unaffected.

### Outputs

| Output | Rule |
|---|---|
| `spent` | sum of `amount` of expenses with the chosen category and `date` from the 1st to the last day of the month (both inclusive), rounded to 2 decimals |
| `remaining` | `limit − spent`, rounded to 2 decimals; negative when over budget |
| `percent_used` | `spent / limit × 100`, rounded to 1 decimal |
| `status` | `ok` if `spent < 80 % of limit`; `warning` if `80 % of limit ≤ spent ≤ limit`; `over` if `spent > limit`. Compared in whole cents, so floating-point noise cannot move a boundary case |

UI labels for the status: `ok` → «В пределах бюджета», `warning` → «Близко к лимиту», `over` → «Бюджет превышен».

### API (code-based implementation)

`GET /api/budget-check?month=2025-03&category=food&limit=100` →
`200 {"month":"2025-03","category":"food","limit":100.0,"spent":80.0,"remaining":20.0,"percent_used":80.0,"status":"warning"}`.
Invalid input → `422` with the FastAPI validation details. The endpoint is read-only.

## 3. Acceptance criteria

| ID | Criterion (observable) |
|---|---|
| AC1 | For a valid month, category and limit the user sees *spent*, *remaining*, *percent used* and *status*; *spent* includes only expenses of that category dated within that calendar month (1st and last day included, neighbouring months excluded). |
| AC2 | The status follows the thresholds exactly: below 80 % → «В пределах бюджета»; 80 % up to and including 100 % → «Близко к лимиту»; above 100 % → «Бюджет превышен» with a negative remaining amount. |
| AC3 | Invalid input (month not `YYYY-MM` or month `00`/`13`; limit empty, ≤ 0 or > 1 000 000) is rejected before any calculation: the field shows an error message and no result is displayed. The API returns HTTP 422 for the same input, and for an unknown category. |
| AC4 | If the server cannot be reached or returns an error, the user sees an error message, the entered values stay in the form, and no old result is shown as if it were current. |
| AC5 | The check is read-only and repeatable: running the same check several times gives the same result and does not change the number of stored expenses. |
| AC6 | A month without matching expenses gives spent 0,00, remaining = limit, 0 % and status «В пределах бюджета». |

## 4. Example data (fictional) and expected results

Fixture loaded into a throwaway database for every manual run (same data in both implementations):

| # | Date | Category | Amount | Description |
|---|---|---|---|---|
| 1 | 2025-02-28 | food | 20.00 | Продукты (конец февраля) |
| 2 | 2025-03-01 | food | 30.00 | Завтрак в кафе |
| 3 | 2025-03-15 | food | 45.50 | Продукты на неделю |
| 4 | 2025-03-31 | food | 4.50 | Кофе |
| 5 | 2025-04-01 | food | 15.00 | Обед (начало апреля) |
| 6 | 2025-03-10 | transport | 18.40 | Такси до вокзала |

Food in March 2025 = 30.00 + 45.50 + 4.50 = **80.00** (rows 1 and 5 are outside March, row 6 is another category).

| Month | Category | Limit | Spent | Remaining | % | Status |
|---|---|---|---|---|---|---|
| 2025-03 | food | 200 | 80.00 | 120.00 | 40.0 | ok |
| 2025-03 | food | 100 | 80.00 | 20.00 | 80.0 | warning |
| 2025-03 | food | 80 | 80.00 | 0.00 | 100.0 | warning |
| 2025-03 | food | 79.99 | 80.00 | −0.01 | 100.0 | over |
| 2025-05 | food | 100 | 0.00 | 100.00 | 0.0 | ok |

The full eight-plus-case test suite derived from these criteria is in `task-04/test-suite.md`.

## 5. Tools and environment (recorded at the start)

Screenshots of the command output: `screenshots/env.png` and `screenshots/baseline-checks.png` in this folder.

| Item | Value |
|---|---|
| OS | macOS 27.0 (Darwin arm64) |
| Python | 3.14.10 (project venv `backend/.venv`) |
| Node.js / npm | v26.13.1 / 11.20.0 via nvm 0.41.0 |
| Backend | FastAPI, SQLAlchemy 2, SQLite; pytest, ruff 0.17.6 |
| Frontend | React 19, Vite 8, HeroUI v3, Tailwind CSS v4; Vitest 5, ESLint 10 |
| Low-code platform | Appsmith (free Community Edition) |
| AI assistant | Claude Code, model Claude Opus 5.5 (`claude-opus-5-5`) |
| Browser for screenshots | Google Chrome |

Baseline checks on `3c44b66` (before any change): `ruff check .` → All checks passed; `pytest -q` → 8 passed,
1 warning; `npm run lint` → exit 0; `npm test` → 4 files, 8 tests passed; `npm run build` → built, exit 0,
chunk-size warning (known baseline warnings, AGENTS.md §4).
