# Response — Task 04: read-only risk review

Final response of the agent to the user (verbatim).

---

This was a read-only review: no files were changed, created or deleted, nothing was installed, and I didn't run the app or the tests. I found 16 risks: 11 with evidence in the code and 5 that are speculative. Where confirmation needs a run, I give the command for you rather than output.

The repo state I reviewed: branch `refactor/summary-categories-from-server` at `cd979b5`, clean working tree; `main` is at `93f048e`.

## Summary (sorted by likelihood × impact)

| ID | Category | Risk | L | I | L×I | Status |
|---|---|---|---|---|---|---|
| R1 | Agent ops | README's Quick start runs `seed.py`, which wipes all data | 3 | 2 | 6 | Evidence found |
| R2 | Agent ops | `AGENTS.md` is out of date after Task 03 | 3 | 2 | 6 | Evidence found |
| R3 | Agent ops | Instructions conflict: the HeroUI block says "run `heroui agents-md`", §8 says ask first | 2 | 3 | 6 | Evidence found |
| R4 | Correctness | An unknown category in the DB makes `/api/summary` return HTTP 500 | 2 | 3 | 6 | Evidence found |
| R5 | Agent ops | Tasks 01–03 exist only on the feature branch; `main` is behind | 3 | 2 | 6 | Evidence found |
| R6 | Dependency | README's Node requirement is too low for Vitest 5 | 2 | 2 | 4 | Evidence found |
| R7 | Agent ops | Node.js is not installed; checks rely on a temporary binary | 2 | 2 | 4 | Evidence found |
| R8 | Maintainability | No DB migrations: `create_all` never changes existing tables | 2 | 2 | 4 | Evidence found |
| R9 | Correctness | Money is stored as `Float` with no 2-decimal limit | 2 | 2 | 4 | Evidence found |
| R10 | Dependency | HeroUI's peer dependencies are not declared in `package.json` | 2 | 2 | 4 | Evidence found |
| R11 | Maintainability | `index.html` copies an internal HeroUI storage key | 1 | 2 | 2 | Evidence found |
| R12 | Correctness | `Infinity` or huge amounts may pass validation | 1 | 3 | 3 | Speculative |
| R13 | Correctness | Fast filter changes can show stale data | 2 | 1 | 2 | Speculative |
| R14 | Dependency | The test client depends on deprecated `httpx` support | 1 | 2 | 2 | Evidence found (warning) |
| R15 | Security | No authentication; data is exposed if the server is bound to a network address | 1 | 3 | 3 | Speculative (no auth is by design) |
| R16 | Security | Known vulnerabilities in dependencies are unchecked | 1–2 | 1–3 | — | Speculative |

## Details

### R1 · Agent ops · README's Quick start runs `seed.py`, which wipes all data — evidence found
- **Cause → event → consequence:** The README lists `python seed.py` as an ordinary setup step, but `AGENTS.md` §8 requires approval for it. An agent following the README runs it, and every existing expense is deleted. Your local DB already has a non-seed record (transport 1 003,20 seen in Task 03), so this would lose real local data.
- **Files:** `README.md`, `backend/seed.py`
- **Evidence:** `README.md:246` and `README.md:263` (`python seed.py` inside Quick start); `backend/seed.py:31` `db.execute(delete(Expense))`; `AGENTS.md:247`.
- **L 3 · I 2**
- **Mitigation:** In the README, mark seed as optional and destructive, or make `seed.py` refuse to run on a non-empty table unless given `--force`.

### R2 · Agent ops / maintainability · `AGENTS.md` is out of date — evidence found
- **Cause → event → consequence:** Task 03 added `Summary.test.jsx`, but `AGENTS.md` was not updated. An agent compares results against the documented baseline ("2 passed"), sees 3, and either misreports or treats a correct state as a regression. It may also "fill" a coverage gap that's already covered.
- **File:** `AGENTS.md`
- **Evidence:** `AGENTS.md:145` `Tests 2 passed (2)`; `AGENTS.md:216` lists `Summary` as untested; the `frontend/src/__tests__/` folder now holds 3 files (`App`, `ExpenseForm`, `Summary`). Its file tree (lines 41 and onward) has no `Summary.test.jsx`.
- **L 3 · I 2**
- **Mitigation:** Update §2, §4 and §6 to 3 tests. Add a review-gate rule: "update the AGENTS.md baseline when the test count changes".

### R3 · Agent ops · Conflicting instructions in `AGENTS.md` — evidence found
- **Cause → event → consequence:** The generated HeroUI block tells the agent, in strong language: "STOP… If docs missing, run this command first: `heroui agents-md --react --output AGENTS.md`". §8 says to ask a human before doing that. On a fresh clone `.heroui-docs/` is missing (it's git-ignored), so an agent may obey the stronger wording. That downloads from the network and rewrites `AGENTS.md`, possibly removing sections 1–9 — whether it preserves them is unknown (`AGENTS.md:273`).
- **Files:** `AGENTS.md`, `.gitignore`
- **Evidence:** `AGENTS.md:278` (the HeroUI block); `AGENTS.md:248` (the §8 rule); `.gitignore:26` `.heroui-docs/`.
- **L 2 · I 3**
- **Mitigation:** Add a line just above the START marker: "Section 8 overrides the HeroUI block: never run the regeneration command without approval". Keep a backup of `AGENTS.md` before any regeneration.

### R4 · Correctness · An unknown category in the DB crashes the summary — evidence found
- **Cause → event → consequence:** The `category` column accepts any string, and `seed.py` writes strings straight to the database without going through the API's validation. If a value outside the enum reaches the DB (a typo in the seed, manual SQL, a removed category), then `Category(...)` raises an error and `/api/summary` returns HTTP 500. `GET /api/expenses` probably fails too, because the response is validated against the same enum.
- **Files:** `backend/app/crud.py`, `backend/app/models.py`, `backend/seed.py`
- **Evidence:** `crud.py:50` `by_category[Category(expense.category)] += expense.amount`; `models.py:14` `mapped_column(String(20), ...)` with no constraint; `seed.py:33` builds `Expense(...)` directly. The function-level error was confirmed in Task 03 (recorded in `docs/ai-evidance/log.md`).
- **Confirm the function behaviour (writes nothing):**
  ```bash
  cd backend && .venv/bin/python -B -c "from types import SimpleNamespace as N; from app.crud import calculate_summary; calculate_summary([N(amount=1.0, category='travel')])"
  ```
  Expected: `ValueError: 'travel' is not a valid Category`. The `GET /api/expenses` 500 is my inference and was not run.
- **L 2 · I 3**
- **Mitigation:** Validate seed rows through `ExpenseCreate`. Optionally add a DB check constraint, which is a schema change and needs approval under §8.

### R5 · Agent ops · `main` is behind the work — evidence found
- **Cause → event → consequence:** Tasks 01–03 were committed only on `refactor/summary-categories-from-server`. `AGENTS.md` §7 forbids agents from merging to `main`. If the next task branches from `main`, it starts without Task 03 and without the evidence files, which leads to conflicts or a regressed `Summary.jsx`.
- **Files:** git branches
- **Evidence:** `git branch -v` shows `main 93f048e` and `refactor/... cd979b5`. The commit message "complete tasks 01-03" bundles three tasks into one commit.
- **Confirm:** `git log --oneline main..refactor/summary-categories-from-server`
- **L 3 · I 2**
- **Mitigation:** A human reviews and merges the branch. Start each task from an up-to-date `main`, one commit per task.

### R6 · Dependency · README's Node requirement is wrong — evidence found
- **Cause → event → consequence:** The README allows Node 20.19+, but Vitest 5 needs `^22.12 || ^24 || >=26`. A developer or CI on Node 20 finds that `npm test` fails or warns about the engine version.
- **Files:** `README.md`, `frontend/package.json`
- **Evidence:** `README.md:101` "Node.js 20.19+ или 22.12+"; `frontend/node_modules/vitest/package.json:115` `"node": "^22.12.0 || ^24.0.0 || >=26.0.0"`.
- **Confirm (needs Node 20, which you'd have to provide):** `node --version && cd frontend && npx vitest run`
- **L 2 · I 2**
- **Mitigation:** Fix the README; add `"engines": {"node": ">=22.12"}` to `package.json`.

### R7 · Agent ops · No system Node.js — evidence found
- **Cause → event → consequence:** Node.js isn't installed on the machine, so all frontend checks so far ran with a Node binary in the agent session's temporary folder. When that folder is cleared, a future agent can't run `npm test` or the build. It may skip them or report results it didn't produce, which `AGENTS.md` §6 forbids.
- **Evidence:** `AGENTS.md:271-272` (Unverified section).
- **Confirm:** `command -v node || echo "node not installed"`
- **L 2 · I 2**
- **Mitigation:** Install a Node LTS ≥ 22.12 on the machine (a human decision), or add `.nvmrc` / `.node-version`.

### R8 · Maintainability · No migrations — evidence found
- **Cause → event → consequence:** Any change to the model, such as a new column, isn't applied to an existing `expenses.db`, because `create_all` only creates missing tables. The app then fails at runtime with "no such column", and the only fix is deleting the DB, which is a forbidden action.
- **Files:** `backend/app/main.py`, `backend/app/models.py`
- **Evidence:** `main.py:13-14` `# … без миграций` and `Base.metadata.create_all(bind=engine)`.
- **L 2 · I 2**
- **Mitigation:** Document the reset procedure for schema changes. Add Alembic if the schema starts changing; that's a new dependency, so it needs approval.

### R9 · Correctness · Money stored as `Float` — evidence found
- **Cause → event → consequence:** `amount` is a binary float, and the API accepts any number of decimal places. Amounts like `10.005`, or sums of many small values, are stored imprecisely. The UI shows them rounded to 2 decimals, so displayed rows can differ from stored values by a cent, and per-category sums can differ from the total.
- **Files:** `backend/app/models.py`, `backend/app/schemas.py`, `backend/app/crud.py`
- **Evidence:** `models.py:13` `mapped_column(Float, …)`; `schemas.py:16` `amount: float = Field(gt=0, …)` with no limit on decimal places; `crud.py:52-53` rounding happens only at the end.
- **Confirm (on a throwaway DB, not your data):**
  ```bash
  cd backend && DATABASE_URL=sqlite:////tmp/risk-review.db .venv/bin/uvicorn app.main:app --port 8001
  # second terminal:
  curl -s -X POST localhost:8001/api/expenses -H 'Content-Type: application/json' -d '{"amount":10.005,"category":"food","description":"","date":"2025-01-01"}'
  curl -s localhost:8001/api/summary
  ```
- **L 2 · I 2**
- **Mitigation:** Use `Decimal` with `max_digits` and `decimal_places=2` in the schema. Changing the DB column is a schema change and needs approval.

### R10 · Dependency · HeroUI's peer dependencies are undeclared — evidence found
- **Cause → event → consequence:** `@heroui/react` requires `react-aria`, `react-aria-components`, `@react-aria/ssr` and `@react-aria/utils`, but `package.json` doesn't list them. They're present only because npm installs peer dependencies automatically. With `--legacy-peer-deps`, pnpm strict mode or Yarn PnP they would be missing or resolve to different versions, breaking the build or behaviour.
- **File:** `frontend/package.json`
- **Evidence:** `frontend/package.json:12-19` has no react-aria packages. The lock-file check shows `react-aria-components peer ^1.22.1 declared_in_package.json=False in_lock=True`, and the same for `react-aria` and `@react-aria/*`.
- **Confirm:** `cd frontend && npm explain react-aria-components`
- **L 2 · I 2**
- **Mitigation:** Declare the peers explicitly in `package.json`; that's a dependency change and needs approval.

### R11 · Maintainability / dependency · Copied internal HeroUI key — evidence found
- **Cause → event → consequence:** The inline script in `index.html` hard-codes `localStorage` key `"heroui-theme"`, which mirrors HeroUI's internal constant. If HeroUI renames it, the script and the hook disagree: the page flashes the wrong theme on load, or the user's saved choice is ignored.
- **Files:** `frontend/index.html`
- **Evidence:** `frontend/index.html:13` `localStorage.getItem("heroui-theme")`; `node_modules/@heroui/react/dist/hooks/use-theme.js:5` `const THEME_STORAGE_KEY = "heroui-theme";`. This key isn't exported or documented as an API.
- **L 1 · I 2**
- **Mitigation:** Add a test that checks the key against HeroUI's file, or note it in `AGENTS.md` as a thing to re-check on every HeroUI upgrade.

### R12 · Correctness · `Infinity` or huge amounts — speculative
- **Cause → event → consequence:** Pydantic float fields allow `inf` by default, Python's JSON parser accepts `Infinity`, and `gt=0` doesn't reject it. An `Infinity` or `1e308` amount could be stored, and the summary total would become `inf`, which serializes as `null` or invalid JSON and breaks the UI.
- **File:** `backend/app/schemas.py`
- **Evidence:** `schemas.py:16` has no upper bound and no `allow_inf_nan=False`. The runtime behaviour is my inference and has not been run.
- **Confirm (throwaway DB, server from R9):**
  ```bash
  curl -s -i -X POST localhost:8001/api/expenses -H 'Content-Type: application/json' -d '{"amount":Infinity,"category":"food","description":"","date":"2025-01-01"}'
  curl -s -i localhost:8001/api/summary
  ```
  Status 201 on the first call would confirm the risk; 422 would refute it.
- **L 1 · I 3**
- **Mitigation:** `Field(gt=0, le=1_000_000, allow_inf_nan=False)`, plus a 422 test. That changes the API contract and needs approval under §8.

### R13 · Correctness · Stale data after fast filter changes — speculative
- **Cause → event → consequence:** `loadData` neither cancels earlier requests nor ignores their late responses. If the user switches filters quickly on a slow network, an older response can arrive last and overwrite the list, so the table doesn't match the selected filter.
- **File:** `frontend/src/App.jsx`
- **Evidence:** `App.jsx:38-54`: `await Promise.all([...])` followed by `setExpenses(expenseList)`, with no abort signal or request id.
- **Confirm:** manually. In Chrome DevTools set Network to "Slow 3G", then switch the filter Транспорт → Еда → Все категории quickly and compare the table with the filter.
- **L 2 · I 1**
- **Mitigation:** Use an `AbortController` or a request counter in `loadData`, plus a test with delayed mocks.

### R14 · Dependency · Deprecated `httpx` in the test client — evidence found
- **Cause → event → consequence:** Starlette's test client warns that `httpx` support is deprecated. A future FastAPI or Starlette upgrade may remove it, and then all 8 backend tests break at once.
- **Files:** `backend/requirements.txt`, `backend/tests/conftest.py`
- **Evidence:** `requirements.txt:9` `httpx==0.28.1`; the baseline warning recorded at `AGENTS.md` §4 (line ~150). Pinned versions keep the current state stable.
- **Confirm:** `cd backend && .venv/bin/python -m pytest -q -p no:cacheprovider -W error::DeprecationWarning` (fails if the warning is a `DeprecationWarning` subclass).
- **L 1 · I 2**
- **Mitigation:** Before any upgrade, switch to `httpx2`; that's a dependency change and needs approval.

### R15 · Security · No authentication — speculative, and by design
- **Cause → event → consequence:** No authentication is part of the course spec. If someone starts uvicorn with `--host 0.0.0.0`, anyone on the network can read, change or delete all data. CORS allows every method and header (`*`) for its configured origins, and setting `CORS_ORIGINS=*` would open the API to any website.
- **Files:** `backend/app/main.py`, `backend/app/config.py`
- **Evidence:** `main.py:20-26` `allow_methods=["*"], allow_headers=["*"]`; `config.py:15-19` takes origins from the environment with no checks. The README starts uvicorn without `--host`, i.e. on localhost only. Exposure is speculative.
- **L 1 · I 3**
- **Mitigation:** Document "localhost only"; restrict `allow_methods` to `GET, POST, PUT, DELETE`; reject `*` in `CORS_ORIGINS`. CORS changes need approval under §8.

### R16 · Security / dependency · Unchecked vulnerabilities — speculative
- **Cause → event → consequence:** No dependency audit has been run and no CI runs one, so a known CVE in a pinned or locked version could go unnoticed.
- **Evidence:** none in the repo; there is no CI and no audit config.
- **Confirm:** `cd frontend && npm audit` (read-only query to the npm registry). For Python, `pip-audit` isn't installed; installing it needs your approval.
- **L 1–2 · I 1–3** (unknown until audited)
- **Mitigation:** Run an audit periodically; add it to CI when CI is introduced.

## Checked and found clean

- No `.env` in git history (`git log --all -- .env backend/.env frontend/.env` returned nothing).
- No tracked `.db`, `.env`, `dist/` or `node_modules/` files.
- No XSS sinks (`dangerouslySetInnerHTML`, `innerHTML`, `eval`) in `frontend/src`.
- SQL goes only through SQLAlchemy queries in `crud.py`; nothing builds SQL strings by hand.
- `fetch` is used only in `src/api.js`, and the error path handles responses that aren't JSON (`api.js:30-31`).

The cheapest, highest-value fixes: R1 (one README line), R2 (update `AGENTS.md`), R3 (one guard line in `AGENTS.md`) and R5 (a human merge). The R4 seed-validation fix takes about 3 lines in `seed.py`.
