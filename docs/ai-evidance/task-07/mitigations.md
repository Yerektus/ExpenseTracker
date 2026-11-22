# Mitigation records

Task 07 corrective actions for the top risks chosen by the course (see `task-05/risk-register.md`).
Risk IDs follow the register: **T1** = "R1" in the course template (no lint checks),
**R18** = "R6" in the course template (weak frontend test coverage).

## M1 — T1 (R1): No lint checks
- Change: added ruff (backend) and ESLint + `lint` script (frontend)
  - `backend/requirements.txt`: `ruff==0.17.6`; new `backend/ruff.toml` (ruff default rules, `target-version = "py311"`)
  - `frontend/package.json`: devDependencies `eslint` ^10.15.0, `@eslint/js` ^10.0.1, `eslint-plugin-react-hooks` ^7.1.1; script `"lint": "eslint ."`; new `frontend/eslint.config.js`
  - `package-lock.json`: +110 packages, no existing package changed version or was removed (checked against `HEAD`)
  - Follow-up in the same task (user asked to "fix" the open items): `frontend/src/App.jsx` data loading refactored so
    `react-hooks/set-state-in-effect` passes without disabling the rule; `AGENTS.md` (lint config, baselines, rules) and
    `README.md` (lint commands) updated
- Commit: **not committed yet** — changes are in the working tree of branch `refactor/summary-categories-from-server`
  (base commit `c989958`); fill in the hash after the human commits
- AI diff review:
  - **Accepted:** ruff with default rules; ESLint flat config with `@eslint/js` + `eslint-plugin-react-hooks`; `lint` script.
  - **Changed:** the first `npm run lint` found `App.jsx:57 react-hooks/set-state-in-effect`. The agent did not disable the
    rule; after the user chose option (a), the first refactor attempt (moving `setState` out of an async `loadData`) still
    failed the rule and was replaced by the React-docs pattern (fetch inside `useEffect`, `setState` only in promise
    callbacks, `ignore` flag, `reloadData()` via `reloadCount`). Two tests (filter, «Повторить») were added for the new paths.
  - **Rejected:** `eslint-plugin-react` — its latest version (7.37.5) declares peer `eslint ^3 … ^9.7` and does not support
    ESLint 10; `globals` package — not covered by the approval (globals are listed by hand in `eslint.config.js`).
- Human approval: dev-dependency addition approved explicitly in the prompt ("ruff … pinned ==" and "eslint with the
  minimal plugins needed for React"); no other dependency changes were made.

## M2 — R18 (R6): Weak frontend test coverage
- Change: added tests for delete and API error display
  - New `frontend/src/__tests__/ExpenseActions.test.jsx` (5 tests): delete removes the row and calls `deleteExpense(1)`;
    delete failure shows «Не удалось удалить расход» and keeps the row; save failure shows the server message in the form;
    filter requests the chosen category; «Повторить» reloads after a load error. `src/api.js` is mocked as a small
    in-memory server; no real backend is called.
  - `frontend/src/setupTests.js`: `ResizeObserver` stub (jsdom lacks it; HeroUI Toast needs it) — test setup, not app code.
  - `toast.clear()` in `beforeEach` (the HeroUI toast queue is global and leaked between tests).
- Commit: **not committed yet** — same working tree as M1; fill in the hash after the human commits
- AI diff review:
  - **Accepted:** the three tests requested in part B (delete, delete error, save error), no application code changed in part B.
  - **Changed:** first run failed with `ReferenceError: ResizeObserver is not defined` → stub added; ESLint reported
    `'beforeEach' is not defined` → imported from `vitest`; a retry test later failed only when run with the others
    ("Found multiple elements with the role alert") → toast queue cleared before each test.
- Proof tests catch bugs: the app was broken on purpose in a **scratch copy** (the repository was not modified), one break at
  a time, and `ExpenseActions.test.jsx` was run after each break (screenshot `screenshots/05-mutation-check.png`):

  | Break | Result |
  |---|---|
  | M0 no change (control) | 5 passed |
  | M1 `deleteExpense` not called | 2 failed |
  | M2 list not reloaded after delete | 1 failed |
  | M3 delete error swallowed | 1 failed |
  | M4 form hides server error | 1 failed |
  | M5 wrong id sent to API | 2 failed |
  | M6 filter change ignored | 1 failed |
  | M7 reload never triggered | 2 failed |
  | M8 retry keeps old error | 1 failed |
  | M9 load error not shown | 1 failed |

## Baseline vs final checks

Baseline = Task 02 run on the original project (commit `93f048e`, screenshots in `task-02/screenshots/`).
Final = run on the current working tree on 2026-11-22 after all Task 07 changes.

| Check | Baseline | Final |
|---|---|---|
| `pytest -q` | 8 passed, 1 warning | 8 passed, 1 warning in 0.09s (exit 0; warning = `StarletteDeprecationWarning`, unchanged) |
| `npm test` | 2 passed | Test Files 4 passed (4), Tests 8 passed (8) |
| `npm run build` | success, chunk warning | `✓ built in 388ms`, exit 0; `index-*.js 775.16 kB`, chunk > 500 kB warning (unchanged) |
| `ruff check .` | command not found | `All checks passed!`, exit 0 |
| `npm run lint` | Missing script | no output, exit 0 |

Note: right before Task 07 (commit `c989958`) `npm test` already showed 3 passed — `Summary.test.jsx` was added in Task 03.

## Not executed
- mypy (not configured — out of scope; adding it is a dependency change that needs approval), CI (not configured)
- `eslint-plugin-react` JSX rules (plugin does not support ESLint 10)
- Splitting `ruff` into a separate dev requirements file (the approval named `requirements.txt`)

## Updated risk scores

| ID | Before | After | Remaining limitation |
|---|---|---|---|
| T1 (R1) | 3×2 = 6 | 1×2 = 2 | mypy still missing; no CI enforces lint (it relies on AGENTS.md §6 and on humans running it); JSX-specific rules unchecked; globals listed by hand |
| R18 (R6) | 2×2 = 4 | 1×2 = 2 | no unit tests for `api.js` error parsing and `ThemeSwitcher`; the edit flow through `App` (calling `updateExpense`) is not tested end-to-end — only `ExpenseForm` in edit mode; no coverage report |
