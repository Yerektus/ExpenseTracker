# Task 04 — Risk review: verification of AI findings

- Date: 2026-11-22
- Repository state: branch `refactor/summary-categories-from-server`, commit `cd979b5` (`main` at `93f048e`)
- Candidates: T1–T5 from Task 01 (baseline analysis), R1–R16 from the AI risk review (`docs/ai-evidance/task-04/response.md`)
- Every finding below was re-checked by opening the file/line or running a command. Runtime checks used a
  **throwaway server** (`DATABASE_URL=sqlite:///<tmp>/risk-review.db uvicorn app.main:app --port 8001`);
  the real `backend/expenses.db` was not touched, and the throwaway DB was deleted afterwards.
- Home-directory paths in quoted output are shortened to `~`.

Status legend:
- **Confirmed** — seen in the code or in command output.
- **Plausible / unverified** — likely, but could not be proven here.
- **Unsupported** — the claim was wrong or the risk is already mitigated.

## Summary

| ID | Category | Finding | L | I | Status |
|---|---|---|---|---|---|
| T1 | Maintainability | No ruff / mypy / ESLint configured | 3 | 1 | **Confirmed** |
| T2 | Dependency | UI libraries outside the original spec; 775 kB JS bundle | 3 | 1 | **Confirmed** |
| T3 | Dependency | `^` version ranges in frontend make installs non-reproducible | 1 | 1 | **Unsupported** (lockfile is committed) |
| T4 | Dependency | `StarletteDeprecationWarning` in tests (same as R14) | 1 | 2 | **Confirmed** |
| T5 | Correctness | Negative amount is accepted | — | — | **Unsupported** (422) |
| R1 | Agent ops | README Quick start runs `seed.py`, which deletes all data | 3 | 2 | **Confirmed** |
| R2 | Agent ops | AGENTS.md baseline is stale (2 frontend tests documented, 3 exist) | 3 | 2 | **Confirmed** |
| R3 | Agent ops | HeroUI block in AGENTS.md says "run `heroui agents-md`", §8 says ask first | 2 | 3 | **Confirmed** (conflict); overwrite behaviour unverified |
| R4 | Correctness | Unknown category in DB → HTTP 500 | 2 | 3 | **Confirmed** (both endpoints) |
| R5 | Agent ops | Tasks 01–03 only on the feature branch; `main` behind | 3 | 2 | **Confirmed** |
| R6 | Dependency | README Node requirement too low for Vitest 5 | 2 | 2 | **Confirmed** (mismatch); failure on Node 20 not run |
| R7 | Agent ops | Node.js not installed system-wide | 2 | 2 | **Confirmed** |
| R8 | Maintainability | No DB migrations (`create_all` only) | 2 | 2 | **Confirmed** (code) |
| R9 | Correctness | Money as float: API and UI round differently | 2 | 2 | **Confirmed** (`1.005` → API `1.0`, UI `1,01`) |
| R10 | Dependency | HeroUI peer deps not declared in `package.json` | 2 | 2 | **Plausible / unverified** (AI's explanation partly wrong) |
| R11 | Maintainability | `index.html` copies HeroUI's internal `"heroui-theme"` key | 1 | 2 | **Confirmed** (coupling) |
| R12 | Correctness | `Infinity` / huge amounts pass validation | 1 | 3 | **Confirmed** (was marked speculative) |
| R13 | Correctness | Fast filter changes can show stale data | 2 | 1 | **Plausible / unverified** |
| R14 | Dependency | Deprecated `httpx` path in TestClient | 1 | 2 | **Confirmed** (AI's proposed check command was wrong) |
| R15 | Security | API exposed / CORS open to any origin | 1 | 3 | **Unsupported** (foreign origin rejected, bound to 127.0.0.1) |
| R16 | Security / dependency | Unchecked known vulnerabilities | ? | ? | **Plausible / unverified** (`npm audit` not run) |
| S1 | Security | `.env` / `*.db` committed to git | — | — | **Not a risk** (only `.env.example` tracked, history clean) |
| A1 | Agent ops | AGENTS.md forbids dependency changes without approval | — | — | **Control present** |

Totals: **15 Confirmed**, **3 Plausible / unverified**, **3 Unsupported** (T3, T5, R15), plus 2 negative checks (S1, A1).
Categories covered: correctness, maintainability, security, dependency, agent operations.

---

## Task 01 candidates

### T1 · Maintainability · No linters / type checkers — Confirmed
```
$ command -v ruff || echo "ruff: command not found"   → ruff: command not found
$ command -v mypy || echo "mypy: command not found"   → mypy: command not found
$ ls backend/.venv/bin/ruff backend/.venv/bin/mypy frontend/node_modules/.bin/eslint
ls: ... No such file or directory   (all three)
$ npm run lint                                         → npm error Missing script: "lint"
```
Mitigation: add ruff + ESLint when the course step allows (dependency change → approval).

### T2 · Dependency · UI libraries outside the original spec, 775 kB bundle — Confirmed
- `frontend/package.json:13-15` — `@gravity-ui/icons`, `@heroui/react`, `@heroui/styles`; `:28` — `tailwindcss`.
  The original spec said "React 18, no UI libraries"; HeroUI v3 (React 19 + Tailwind v4) was added later on the user's explicit request.
- `npm run build`:
```
dist/assets/index-Du17J_JN.css  470.84 kB │ gzip:  43.47 kB
dist/assets/index-CBLzvOQA.js   775.09 kB │ gzip: 237.83 kB
(!) Some chunks are larger than 500 kB after minification.
✓ built in 354ms
```
Mitigation: record the spec deviation; code-split if size matters.

### T3 · Dependency · `^` ranges in frontend — Unsupported
- `frontend/package.json` contains 16 caret ranges — true.
- But the condition for the risk ("if `package-lock.json` is not committed") is false:
```
$ git ls-files frontend/package-lock.json
frontend/package-lock.json
```
With the lockfile committed, `npm ci` / `npm install` resolve the locked versions. Residual risk only if someone runs `npm update` (forbidden without approval by AGENTS.md §7).

### T4 · Dependency · StarletteDeprecationWarning — Confirmed
```
$ cd backend && pytest -q
~/…/fastapi/testclient.py:1: StarletteDeprecationWarning: Using `httpx` with `starlette.testclient` is deprecated; install `httpx2` instead.
8 passed, 1 warning in 0.08s
```
Same finding as R14.

### T5 · Correctness · Negative amount accepted — Unsupported
```
$ curl -X POST localhost:8001/api/expenses -d '{"amount":-5,"category":"food",...}'
{"detail":[{"type":"greater_than",...,"msg":"Input should be greater than 0","input":-5,...}]}  -> HTTP 422
$ curl ... -d '{"amount":0,...}'
{"detail":[{"type":"greater_than",...,"msg":"Input should be greater than 0","input":0,...}]}   -> HTTP 422
```
`backend/app/schemas.py:16` — `amount: float = Field(gt=0, ...)`. Also covered by `test_create_expense_with_invalid_data_returns_422`.

---

## AI risk review candidates (R1–R16)

### R1 · Agent ops · Quick start wipes data — Confirmed
- `README.md:148`, `:246`, `:263` — `python seed.py` in setup / Quick start.
- `backend/seed.py:31` — `db.execute(delete(Expense))`.
- `AGENTS.md:247` requires approval for running it → the README and AGENTS.md disagree.
Mitigation: mark seed as optional/destructive in README, or require `--force` on a non-empty table.

### R2 · Agent ops · Stale AGENTS.md — Confirmed
- `AGENTS.md:145` — `Test Files 2 passed (2), Tests 2 passed (2)`; `AGENTS.md:216` — lists `Summary` as untested.
- Actual: `npm test` → `Test Files 3 passed (3)`, `Tests 3 passed (3)`; `frontend/src/__tests__/` has `Summary.test.jsx`.
Mitigation: update §2/§4/§6; add "update the baseline when test counts change" to review gates.

### R3 · Agent ops · Conflicting instructions — Confirmed (conflict); consequence unverified
- `AGENTS.md:278` (generated block): `If docs missing, run this command first: heroui agents-md --react --output AGENTS.md`.
- `AGENTS.md:248` (§8): regenerating requires approval. `.gitignore:26` ignores `.heroui-docs/`, so a fresh clone triggers "docs missing".
- Not verified: whether the CLI would overwrite sections 1–9 (not run — network + file rewrite).
Mitigation: one line above the START marker stating that §8 takes precedence.

### R4 · Correctness · Unknown category → HTTP 500 — Confirmed
Inserted a row with `category='travel'` directly into the throwaway DB (bypassing the API, as `seed.py` does):
```
$ sqlite3 <tmp>/risk-review.db "insert into expenses (...) values (5.0, 'travel', '', '2025-01-03');"
GET /api/summary  -> HTTP 500     (server log: ValueError: 'travel' is not a valid Category)
GET /api/expenses -> HTTP 500     (server log: fastapi.exceptions.ResponseValidationError)
```
Code: `backend/app/crud.py:50` `Category(expense.category)`; `backend/app/models.py:14` plain `String(20)`.
The AI review said `/api/expenses` "probably" fails too — now confirmed.
Mitigation: validate seed rows via `ExpenseCreate`; optional DB CHECK constraint (schema change → approval).

### R5 · Agent ops · `main` is behind — Confirmed
```
$ git branch -v
  main                                    93f048e docs: add AGENTS.md and AI evidence
* refactor/summary-categories-from-server cd979b5 feat: complete tasks 01-03 (...)
$ git log --oneline main..refactor/summary-categories-from-server
cd979b5 feat: complete tasks 01-03 (baseline, AGENTS.md, pattern refactor)
```
Mitigation: human review + merge; one commit per task.

### R6 · Dependency · Node requirement mismatch — Confirmed (mismatch)
- `README.md:101` — "Node.js 20.19+ или 22.12+".
- `frontend/node_modules/vitest/package.json:115` — `"node": "^22.12.0 || ^24.0.0 || >=26.0.0"` (Vite: `^20.19.0 || >=22.12.0`).
- Not verified: actual behaviour on Node 20 (no Node 20 available).
Mitigation: fix README; add `"engines": {"node": ">=22.12"}`.

### R7 · Agent ops · No system Node.js — Confirmed
```
$ command -v node || echo "node: command not found"
node: command not found
```
All frontend checks in this review used a standalone Node v26.13.1 binary from the agent's temporary folder.
Mitigation: install Node LTS ≥ 22.12 (human decision); add `.nvmrc`.

### R8 · Maintainability · No migrations — Confirmed (code)
`backend/app/main.py:13-14` — `# Для учебного проекта таблицы создаются при старте, без миграций.` / `Base.metadata.create_all(bind=engine)`.
Not demonstrated at runtime (would require a schema change).
Mitigation: document the DB reset procedure; Alembic if the schema evolves (dependency → approval).

### R9 · Correctness · Float money, inconsistent rounding — Confirmed
```
POST amount 10.005 → 201, stored as 10.005 (no 2-decimal limit)
POST amount 1.005 (transport) → 201
GET /api/summary → "transport": 1.0          (Python round(1.005, 2) = 1.0)
UI formatAmount(1.005) → "1,01"              (Intl.NumberFormat ru-RU)
```
So a single 1.005 expense shows **1,01** in the table but **1,00** in the summary.
Code: `models.py:13` `Float`; `schemas.py:16` no decimal limit; `crud.py:52-53` rounding with `round()`.
Mitigation: `Decimal` with `decimal_places=2` in the schema (API contract → approval), or reject > 2 decimals.

### R10 · Dependency · Undeclared HeroUI peers — Plausible / unverified
- Confirmed: `frontend/package.json` has no `react-aria` / `react-aria-components`; `@heroui/react/package.json:497-498` declares them as peers.
- AI claim partly wrong: it said they are present "only because npm installs peers automatically". `npm explain` shows another path:
```
react-aria-components@1.22.1
  react-aria-components@"1.22.1" from @adobe/react-spectrum@3.47.7
    @adobe/react-spectrum@"^3.47.0" from @react-spectrum/provider@3.11.1
      peer @react-spectrum/provider@"^3.0.0" from @react-types/color@3.2.0
        @react-types/color@"3.2.0" from @heroui/react@3.2.7
```
- Not verified: actual breakage under pnpm strict / `--legacy-peer-deps` (would require a new install).

### R11 · Maintainability · Copied internal key — Confirmed (coupling)
`frontend/index.html:13` — `localStorage.getItem("heroui-theme")`; `node_modules/@heroui/react/dist/hooks/use-theme.js:5` — `const THEME_STORAGE_KEY = "heroui-theme";` (not a documented export). Breakage would only occur after a HeroUI upgrade — not demonstrated.

### R12 · Correctness · Infinity / huge amounts — Confirmed (AI marked it speculative)
```
POST {"amount":Infinity,...} → HTTP 201, response {"amount":null,...}; stored in SQLite as Inf
POST {"amount":1e308,...} ×2 → HTTP 201 both
GET /api/summary → {"by_category":{"food":null,...,"other":0.3},"total":null}   HTTP 200
```
The summary total becomes `null`. By code reading (not run), the UI's `formatAmount(null)` → `Number(null)` → shows `0,00`, silently hiding the problem.
Mitigation: `Field(gt=0, le=<limit>, allow_inf_nan=False)` + 422 test (API contract → approval).

### R13 · Correctness · Stale data on fast filter changes — Plausible / unverified
Code: `frontend/src/App.jsx:38-54` — no `AbortController` or request id before `setExpenses(...)`. Not reproduced (needs manual network throttling in the browser).

### R14 · Dependency · Deprecated httpx path — Confirmed (warning), AI check command wrong
The warning is real (see T4). The AI suggested `pytest -W error::DeprecationWarning` "fails if the warning is a DeprecationWarning subclass" — it did **not** fail:
```
$ pytest -q -p no:cacheprovider -W error::DeprecationWarning
8 passed, 1 warning in 0.08s
```
So that command does not confirm or catch this warning.

### R15 · Security · API exposed / CORS open — Unsupported
```
$ curl -i -X OPTIONS .../api/expenses -H 'Origin: http://evil.example' -H 'Access-Control-Request-Method: DELETE'
HTTP/1.1 400 Bad Request
Disallowed CORS origin
$ curl -i -X OPTIONS ... -H 'Origin: http://localhost:5173' ...
HTTP/1.1 200 OK
access-control-allow-origin: http://localhost:5173
access-control-allow-methods: DELETE, GET, HEAD, OPTIONS, PATCH, POST, PUT, QUERY
$ lsof -iTCP:8001 -sTCP:LISTEN → 127.0.0.1:8001
```
CORS is not open to `*` (no `.env`; `.env.example:8` → `CORS_ORIGINS=http://localhost:5173`), and uvicorn binds to localhost by default. No authentication is a deliberate design decision of the course spec. Minor confirmed detail: `allow_methods=["*"]` (`main.py:24`) advertises PATCH/QUERY that the API doesn't use.

### R16 · Security / dependency · Unchecked vulnerabilities — Plausible / unverified
`npm audit` was not run (network request, AGENTS.md §8). Command for a human: `cd frontend && npm audit`. Python: `pip-audit` is not installed.

---

## Additional checks (security / agent operations)

### S1 · Secrets or databases in git — Not a risk
```
$ git ls-files | grep -E "\.db|\.env"
.env.example
$ git log --all --oneline -- '*.env' '.env' '*.db'
(no output)
```
Only `.env.example` is tracked; it contains no secrets (only `CORS_ORIGINS`, `VITE_API_URL`, a commented `DATABASE_URL`).

### A1 · Dependency changes forbidden for agents — Control present
`AGENTS.md:225` (§7 Forbidden): "Adding, removing, or upgrading dependencies (`requirements.txt`, `package.json`, `package-lock.json`) without human approval"; `AGENTS.md:236` (§8): "Dependency changes of any kind".

---

## Where the AI was wrong or imprecise

| Item | AI said | Verification showed |
|---|---|---|
| T5 (Task 01) | Negative amount is not validated | 422 `greater_than` — wrong guess |
| T3 (Task 01) | `^` ranges are a reproducibility risk | Lockfile is committed — mitigated |
| R15 | Possible exposure / open CORS | Foreign origin rejected, localhost-only bind |
| R10 | Peers present only via npm peer auto-install | Also pulled through `@react-types/color → @adobe/react-spectrum` |
| R14 | `-W error::DeprecationWarning` confirms the warning | Tests still pass — command does not catch it |
| R12 | Speculative | Actually confirmed (201, `total: null`) |
| R4 | `/api/expenses` "probably" fails | Confirmed HTTP 500 |
