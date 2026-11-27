# Response — Task 06: agent-readiness audit

Final response of the agent to the user (verbatim).

---

This was a read-only audit: I didn't modify, create or delete anything, and I didn't run the app or the tests. The evidence comes from reading files and from `git`; wherever confirmation needs an actual run, I give you the command instead of output.

**Reviewed state:** branch `refactor/summary-categories-from-server` at `d4e7549`, clean working tree; `main` is at `93f048e`. `AGENTS.md` hasn't changed since Task 02.

## Scorecard

| # | Criterion | Verdict |
|---|---|---|
| 1 | Readable project structure | **Pass** |
| 2 | README accuracy | **Partial** |
| 3 | Reproducible setup | **Partial** |
| 4 | Pinned dependencies | **Partial** |
| 5 | Automated tests | **Partial** |
| 6 | Lint and type checks | **Fail** |
| 7 | Build command | **Pass** |
| 8 | Logging | **Partial** |
| 9 | Security safeguards | **Pass** (with caveats) |
| 10 | AGENTS.md | **Partial** |

## Evidence

### 1. Readable project structure — Pass
- The repo has 33 tracked source and config files, cleanly split into `backend/app/` (config, database, models, schemas, crud, routers), `backend/tests/` and `frontend/src/` (api, components, `__tests__`).
- Each layer has one place: HTTP calls only in `frontend/src/api.js`, database access only in `backend/app/crud.py`, settings only in `backend/app/config.py`. This is documented in the annotated tree and the "where logic lives" table in `AGENTS.md:19-103`.
- Minor gap: `docs/` (evidence, risk register, acceptance criteria) isn't described in `README.md` or `AGENTS.md`; `grep -c 'ai-evidance' AGENTS.md` returns 0.

### 2. README accuracy — Partial
What matches:
- The documented commands match the `package.json` scripts: `npm run dev`, `npm test`, `npm run build` and `npm run preview` correspond to `"dev"`, `"test"`, `"build"` and `"preview"` (`frontend/package.json`).
- The API table (`README.md:71-76`) matches all 6 routes in the code (`routers/expenses.py:26,31,36,42,48`, `main.py:31`).

What's wrong:
- **Node version:** `README.md:101` says "Node.js 20.19+ или 22.12+", but Vitest requires `^22.12.0 || ^24.0.0 || >=26.0.0` (`frontend/node_modules/vitest/package.json:115`).
- **Outdated file tree:** it shows only `App.test.jsx` and `ExpenseForm.test.jsx` (`README.md:47-49`); `Summary.test.jsx` is missing.
- **No pointer to agent docs:** the README never mentions `AGENTS.md`, `DESIGN.md` or `docs/` (each has 0 mentions).
- **Destructive step in Quick start:** `python seed.py` sits in Quick start (`README.md:246`, `263`). The warning that it wipes data appears only earlier, at line 151.

### 3. Reproducible setup — Partial
What's in place:
- Exact steps for macOS/Linux and Windows (`README.md:126-165`, `211-232`).
- `.env.example` with all three variables, all optional.
- `frontend/package-lock.json` is committed (`lockfileVersion: 3`).
- `requirements.txt` uses `==` pins.

What's missing:
- **No runtime version pins:** there's no `.nvmrc`, `.node-version`, `.python-version`, `.tool-versions` or `engines` field.
- **Python sub-dependencies aren't locked** (see #4).
- **Setup from a fresh clone has never been verified;** `AGENTS.md:270` records this as unverified.
- **Node.js isn't installed on the audited machine** (Task 04, R7).

To confirm a fresh clone works:
```bash
git clone <repo> /tmp/et-fresh && cd /tmp/et-fresh
cd backend && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt && .venv/bin/python -m pytest -q
cd ../frontend && npm ci && npm test && npm run build
```

### 4. Pinned dependencies — Partial
- **Backend:** all 7 direct dependencies are pinned (`requirements.txt:1-9`), but their sub-dependencies (`starlette`, `pydantic-core`, `uvicorn[standard]` extras, …) are not. Test and runtime dependencies are mixed in one file.
- **Frontend:** `package.json` uses 16 `^` ranges, but the committed lock file makes `npm ci` reproducible. That's why the Task 04 finding T3 was Unsupported.
- To see how many backend packages are actually unpinned: `cd backend && .venv/bin/pip freeze | wc -l`, then compare with the 7 lines in `requirements.txt`.

### 5. Automated tests — Partial
- **Backend, 8 tests** (`test_expenses.py:7-96`): create, 422 on bad input, list with filter, update, delete, 404, summary, and a unit test of `calculate_summary`. Each test gets its own temporary database (`tests/conftest.py`).
- **Frontend, 3 tests:** the edit form submits changed data (`ExpenseForm.test.jsx:13`), an error alert shows when the API fails (`App.test.jsx:13`), and the summary shows the categories the server returns (`Summary.test.jsx:4`).
- **Not covered:**
  - `GET /api/health`, CORS behaviour, `seed.py`.
  - The delete flow with its confirmation dialog (`ExpenseList`), `api.js` error parsing, `ThemeSwitcher`.
  - Rejection of `Infinity` and of amounts with more than 2 decimals (R9, R12).
- **No coverage tool** (`pytest-cov` / Vitest coverage) and **no CI** (`.github/`, `.gitlab-ci.yml` and `.husky` are all absent), so nothing runs the tests automatically.
- To confirm: `cd backend && .venv/bin/python -m pytest -q` and `cd frontend && npm test`.

### 6. Lint and type checks — Fail
- `ruff` and `mypy` aren't on PATH or in `backend/.venv`.
- There's no `eslint` binary, no `lint` script in `package.json`, and no config files for any of these tools. `AGENTS.md:155-159` documents this.
- To confirm: `command -v ruff mypy; cd frontend && npm run lint` (expected: `Missing script: "lint"`).

### 7. Build command — Pass
- `"build": "vite build"` in `frontend/package.json`, documented at `README.md:232` and `AGENTS.md:146`. In Task 04 the build succeeded with a known chunk-size warning (775 kB JS).
- The backend has no build step and doesn't need one.
- To confirm: `cd frontend && npm run build`.

### 8. Logging — Partial
- `backend/app` contains no `logging` or `print` calls; the only output comes from uvicorn's default access and error logs. In Task 04, the R4 traceback (`ValueError: 'travel' is not a valid Category`) only showed up in uvicorn's error output.
- `seed.py:37` uses `print`. `frontend/src` has no `console` calls; errors are shown to the user only through `Alert` and `toast`.
- There's no request ID, no log level setting, and no structured logging.
- To see the log you get today: run `cd backend && .venv/bin/uvicorn app.main:app --port 8001` and call `curl localhost:8001/api/health` from another terminal.

### 9. Security safeguards — Pass (with caveats)
What's in place:
- **Git ignores secrets and the DB:** `.gitignore:9` `*.db`, `:10` `*.sqlite3`, `:18` `.env`.
- **Nothing sensitive is committed:** `git ls-files | grep -E "\.db|\.env"` returns only `.env.example`, which contains no secrets.
- **No secret-like names in the code:** grep found no `secret`, `password`, `api_key` or `token` in `backend/app`, `frontend/src` or `.env.example`.
- **CORS allows one explicit origin:** `main.py:22` uses `CORS_ORIGINS`, which defaults to `http://localhost:5173`; credentials are off (`main.py:23`). Task 04 showed a request from a foreign origin is rejected with `400 Disallowed CORS origin`.

Caveats:
- `allow_methods=["*"]` (`main.py:24`) is broader than needed.
- There's no authentication, by design of the course spec.
- No dependency audit has been run (R16).
- No Infinity or upper-bound check on amounts (R12).
- To confirm: `git ls-files | grep -E "\.db|\.env"` and `git log --all --oneline -- '*.env' '.env' '*.db'`.

### 10. AGENTS.md — Partial
What's in place:
- **Safe commands** with baseline results (§4, lines 138-160).
- **Prohibited actions** (§7, line 219 onward), including no dependency changes, no destructive commands, no push or merge to `main`.
- **Actions that need approval** (§8, line 233 onward).
- **Test rules** (§6: every change comes with a test, never invent output).
- **Review gates** (§9, line 253 onward: summary, diff, test and build output, risks; a human approves every diff).
- **A list of what isn't configured yet** (lines 155-159).

What's wrong:
- **Outdated baseline:** `AGENTS.md:145` says `Tests 2 passed (2)`, and `AGENTS.md:216` still lists `Summary` as untested (R2).
- **Conflicting instruction:** the generated HeroUI block says "If docs missing, run … `heroui agents-md --output AGENTS.md`" (line 278), while §8 requires approval for exactly that (line 248) (R3).
- **No mention** of the `docs/ai-evidance` workflow, the risk register or the acceptance criteria.
- **May not load automatically:** the repo has no `CLAUDE.md`, so whether Claude Code picks up `AGENTS.md` on its own is unverified (R17). To confirm: start a new Claude Code session in the repo and run `/memory`.

## Readiness level: **2 — Documented**

Everything needed to work in the repo is written down. Structure, setup, safe commands, prohibitions and review gates are explicit, and the tests and build exist and pass (8 / 3 / build OK in Task 04).

It isn't **Agent-ready** yet, because nothing enforces these rules automatically: there are no linters or type checks, no CI, and the documentation already disagrees with the repo in several places (Node version, test baseline, file tree).

### Evidence still needed for level 3
1. **Lint and type checks:** `ruff check .`, `mypy` (or a decision not to use it) and `npm run lint` exist and pass; `AGENTS.md` §4 lists them as safe commands with their baseline output. Adding them is a dependency change and needs your approval.
2. **Automatic enforcement:** a CI workflow, or at least one documented verification script, that runs `pytest -q`, `npm test`, `npm run build` and the linters on every change, plus one recorded green run.
3. **Up-to-date `AGENTS.md`:**
   - the baseline updated to 3 frontend tests;
   - the "Summary untested" note removed;
   - a guard line saying §8 overrides the HeroUI block;
   - the `docs/` workflow described.
4. **Up-to-date README:**
   - Node ≥ 22.12;
   - `Summary.test.jsx` in the file tree;
   - links to `AGENTS.md` and `DESIGN.md`;
   - the `seed.py` warning placed inside Quick start.
5. **Pinned runtimes:** `.nvmrc` (or an `engines` field) and `.python-version`, plus fully locked Python dependencies (for example `pip freeze` output or a lock tool, which needs approval).
6. **Proof of reproducibility:** output of the fresh-clone commands from #3 on a machine with system Node ≥ 22.12.
7. **Coverage of key flows:** tests for delete with confirmation, `api.js` errors and `/api/health`; ideally a coverage report.
8. **Agent rules load automatically:** confirmed in a new session (for example via a `CLAUDE.md` with `@AGENTS.md`, if the course allows).
9. **Branch hygiene:** the feature branch reviewed and merged into `main` by you, so the next task starts from current code (R5).
