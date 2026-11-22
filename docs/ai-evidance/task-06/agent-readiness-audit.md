# Agent-readiness audit

- Date: 2026-11-22
- Audited state: branch `refactor/summary-categories-from-server`, commit `d4e7549`
- Method: each "?" item from the draft was checked by running commands. README steps (macOS/Linux) were
  followed exactly on a **fresh `git clone`** in a temporary folder, so the working repo and its
  `backend/expenses.db` were not touched. Node.js is not installed system-wide, so frontend steps after
  `npm install` used a standalone Node v26.13.1. Windows steps were not run.

| # | Criterion | Result | Evidence |
|---|---|---|---|
| 1 | Readable structure | Pass | Clear backend/frontend split; routers / crud / schemas separated (`backend/app/routers/expenses.py`, `crud.py`, `schemas.py`); HTTP only in `frontend/src/api.js`; documented in `AGENTS.md:19-103` |
| 2 | README accuracy | Partial | Fresh clone, README macOS steps as written: `cp .env.example .env`, `python3 -m venv .venv`, `pip install -r requirements.txt`, `python seed.py` ("Добавлено расходов: 10"), `uvicorn app.main:app --reload` (`/api/health` → 200), `pytest` (8 passed) — all exit 0. `npm install` → `bash: npm: command not found` (Node not installed). With Node v26: `npm install` OK, `npm run dev` → 200, `npm test` → 3 passed, `npm run build` OK. Differences: README requires "Node.js 20.19+ или 22.12+" (`README.md:101`) but Vitest needs `^22.12 \|\| ^24 \|\| >=26`; file tree lacks `Summary.test.jsx` (`README.md:47-49`); no mention of `AGENTS.md` / `DESIGN.md`; `seed.py` (deletes all expenses) is part of Quick start (`README.md:246, 263`) |
| 3 | Reproducible setup | Partial | Fresh clone installs and runs (row 2). `npm install` left `package-lock.json` unchanged (`git status --short` empty after install and build). Conda + venv ambiguity confirmed: conda base is active (`CONDA_PREFIX` set), `python3` and `pip` resolve to `~/miniconda3/bin/`, `backend/.venv/pyvenv.cfg` → `home = ~/miniconda3/bin`; README never mentions conda, so without `source .venv/bin/activate` commands run against conda. No `.nvmrc` / `.python-version` / `engines` field |
| 4 | Pinned dependencies | Partial | Backend: 7 direct deps pinned with `==` (`backend/requirements.txt`), but `pip freeze \| wc -l` in the fresh venv → 29 packages, so 22 sub-dependencies are not pinned. Frontend: 16 `^` ranges in `package.json`, but `package-lock.json` is committed and `npm install` did not change it |
| 5 | Tests | Partial | Backend: 8 passed (fresh clone). Frontend: **3** tests, 3 passed — edit submit (`ExpenseForm.test.jsx`), API error alert (`App.test.jsx`), summary rows (`Summary.test.jsx`). Not covered: delete flow with `AlertDialog` (`ExpenseList`), `api.js` error parsing, `ThemeSwitcher`, `GET /api/health`, `seed.py`. No coverage tooling, no CI |
| 6 | Lint / type checks | Fail | `ruff: command not found`, `mypy: command not found`; `npm run lint` → `npm error Missing script: "lint"` (T1) |
| 7 | Build | Pass (warning) | Fresh clone `npm run build` → `index-CBLzvOQA.js 775.09 kB`, `(!) Some chunks are larger than 500 kB`, `✓ built in 325ms` |
| 8 | Logging | Partial | `grep -rn "logging\|logger" backend/app` → no matches (exit 1): no application logging. Only uvicorn defaults: startup lines (`INFO: Uvicorn running on http://127.0.0.1:8000`, `Application startup complete.`) and unhandled-error tracebacks (Task 04 R4: `ValueError: 'travel' is not a valid Category` appeared only in uvicorn output). No request IDs or log levels; `seed.py:37` uses `print` |
| 9 | Security safeguards | Pass | `.gitignore` contains `.env`, `*.db`, `*.sqlite3`, `.venv/`, `node_modules/`; `git ls-files \| grep -E "\.db\|\.env"` → only `.env.example` (no secrets). CORS: `allow_origins=CORS_ORIGINS` (`main.py:22`), default `http://localhost:5173` (`config.py:17`), `allow_credentials=False`; preflight from `http://localhost:5173` → `access-control-allow-origin: http://localhost:5173`, foreign origin → `400 Disallowed CORS origin` (Task 04). Caveats: `allow_methods=["*"]` (`main.py:24`); no auth by design |
| 10 | AGENTS.md | Partial | Present: safe commands with baselines (§4), forbidden actions (§7), approval list (§8), review gates (§9). But the baseline is stale — `AGENTS.md:145` says `Tests 2 passed (2)` while the fresh run gives 3 — and the generated HeroUI block (`AGENTS.md:278`) tells agents to regenerate the file, which §8 (`AGENTS.md:248`) requires approval for |

## Readiness level: **2 — Documented**

Justification: the project runs from a fresh clone by following the README, tests pass (8 backend, 3 frontend),
the build succeeds, and AGENTS.md documents setup, safe commands, prohibited actions and review gates.
It is not level 3 because automated quality gates are incomplete: no lint/type checks, no CI to enforce
checks, frontend coverage misses the delete flow and API error parsing, Python sub-dependencies and runtime
versions are not pinned, and the documentation has drifted from the repo (Node version, test baseline).

## Missing evidence for level 3
- Lint and type checks configured and passing (ruff, mypy, eslint)
- Frontend tests covering the delete flow and `api.js` error handling (edit and error display are already covered)
- Clean-clone install verified with `npm ci` on a machine with system Node ≥ 22.12 (lock file is already committed)
- Runtime versions pinned (`.nvmrc` or `engines`, `.python-version`) and Python sub-dependencies locked
- README and AGENTS.md brought in line with the repo (Node ≥ 22.12, 3 frontend tests, `Summary.test.jsx` in the tree, conda vs venv note)
- CI pipeline running tests, lint and build on every change
- Logging for API errors

## After mitigations (fill in after Task 07)
- Level: **2 — Documented** (unchanged).  Changes: lint configured and passing; frontend tests 3 → 8; AGENTS.md and
  README updated (details in `task-07/mitigations.md`; not committed yet at the time of writing).

| # | Criterion | Before | After Task 07 | Evidence (real output, 2026-11-22) |
|---|---|---|---|---|
| 5 | Tests | Partial | Partial (improved) | `npm test` → Test Files 4 passed (4), Tests 8 passed (8); delete, delete/save errors, filter and «Повторить» now covered; still no `api.js` / `ThemeSwitcher` tests, no coverage tooling, no CI |
| 6 | Lint / type checks | Fail | Partial | `ruff check .` → `All checks passed!`; `npm run lint` → exit 0; type checks (mypy) still missing |
| 2 | README accuracy | Partial | Partial | Lint commands and new files documented; Node requirement still says 20.19+ |
| 10 | AGENTS.md | Partial | Partial (improved) | Baselines re-measured (4 files / 8 tests, lint rows), lint rules added; HeroUI block still conflicts with §8 |

Still missing for level 3: CI that runs tests, lint and build on every change; type checks; pinned runtimes
(`.nvmrc` / `.python-version`) and locked Python sub-dependencies; README Node requirement fixed; clean-clone
verification with `npm ci` on a machine with system Node ≥ 22.12; logging for API errors.

---

## Changes compared with the draft
| # | Draft | Verified |
|---|---|---|
| 2 | ? | Partial — all README commands work in a fresh clone except `npm` (not installed); Node version and file tree are wrong |
| 3 | "frontend depends on lock file (R3)" | Lock file is committed and `npm install` keeps it unchanged; conda + venv ambiguity confirmed |
| 4 | "frontend `^` ranges" | Ranges exist but are locked by the committed lock file; the real gap is 22 unpinned Python sub-dependencies |
| 5 | "frontend only 2 tests (R6)" | 3 tests; edit and error handling are covered, delete flow and `api.js` are not |
| 8 | ? | Partial — no app logging, only uvicorn default output |
| 9 | ? | Pass — `.env` / `*.db` ignored and not tracked, CORS limited to `localhost:5173` |
| 10 | Pass | Partial — required sections present, but baseline stale and HeroUI block conflicts with §8 |
