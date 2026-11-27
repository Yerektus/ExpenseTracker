# Task 08 — Final engineering decision: READY WITH CONDITIONS

Reviewed version: working tree of branch `feature/budget-check` (base `3c44b66`), code-based implementation of the
budget check. The decision is about releasing the code-based feature into the Expense Tracker; the Appsmith
version is a comparison prototype and is not released.

## 1. Evidence

| Check | Baseline (`3c44b66`) | Final | Source |
|---|---|---|---|
| `ruff check .` | All checks passed | All checks passed | `task-01/screenshots/baseline-checks.png`, `screenshots/final-checks.png` |
| `pytest -q` | 8 passed, 1 warning | 30 passed, 1 warning (baseline `StarletteDeprecationWarning`) | same |
| `npm run lint` | exit 0 | exit 0 | same |
| `npm test` | 4 files, 8 passed | 6 files, 17 passed | same |
| `npm run build` | built, chunk warning (775.16 kB) | built, same warning (779.57 kB, +4.4 kB) | same |
| Common test suite, code-based | — | 11 / 11 Pass (UI) + API suite as expected | `task-04/` |
| Common test suite, Appsmith (comparison only) | — | 11 / 11 Pass | `task-04/screenshots/ui-run-lowcode-1.png`, `task-04/screenshots/ui-run-lowcode-2.png` |
| SAST / DAST / SCA | — | 0 findings / 6 checks pass / 0 known vulnerabilities | `task-06/` |

## 2. Acceptance criteria

| AC | Status | Evidence |
|---|---|---|
| AC1 values only from category + calendar month | Holds | TC01, TC05; `test_budget_check_counts_only_category_and_month` |
| AC2 status thresholds | Holds | TC02–TC04; `test_budget_check_boundaries` |
| AC3 invalid input rejected, 422 from API | Holds | TC07b–TC09, API-only unknown category; `test_budget_check_rejects_invalid_input` (11 cases) |
| AC4 failure handling | Holds | TC11 (`tc11.png`); `BudgetCheckApp` error test |
| AC5 read-only and repeatable | Holds | TC10; D4 (405 for POST/DELETE); `test_budget_check_is_read_only_and_repeatable` |
| AC6 empty month | Holds | TC06 |

## 3. Confirmed defects and fixes

| ID | Defect | Status |
|---|---|---|
| F1 | Limit below one cent / with fractions of a cent → wrong status, `-0,00` | Fixed (schema `ge=0.01` + whole-cents validator; same rule in UI and Appsmith) |
| F2 | Tiny limit → `percent_used: null` with HTTP 200 | Fixed (same fix) |
| F3 | Budget card kept stale numbers after an expense changed | Fixed (state moved to `App.jsx`, re-run on reload) |
| F7 | Extra CORS preflight for every new GET URL (pre-existing in `api.js`) | Open, low impact, out of scope |

## 4. Remaining limitations

- F6 (plausible): an unknown `status` value would crash the page; unreachable while the backend enum and the UI
  map are changed together.
- F5 (by design): `percent_used` is rounded to 1 decimal, so "100,0 %" can appear with «Бюджет превышен».
- One category and one month per check; budgets are not stored.
- Month is typed as text `ГГГГ-ММ` (no month picker).
- Verified only on macOS, Python 3.14.10, Node v26.13.1, Chrome headless; not checked on Windows or other versions.

## 5. Residual security risks

No authentication on the API (pre-existing; acceptable only on localhost); Python transitive dependencies not
locked; Appsmith app must stay private; prompt-injection exposure of the coding agent controlled only by
AGENTS.md rules and the permission mode (details: `task-06/security-assessment.md` §7).

## 6. Decision

**Ready with conditions.** The feature meets all six acceptance criteria, passes the common suite and every check,
and the two meaningful defects found by the agentic review are fixed and guarded by tests. Conditions:

1. A human reviews the full diff and commits it on `feature/budget-check`; merge into `main` through a reviewed
   pull request only (AGENTS.md §7, §9).
2. The app stays local (no deployment) while the API has no authentication (R1).
3. The Appsmith prototype stays private (not "public") and is not treated as a release artifact.

## 7. Next improvement to prioritise

**Lock the Python transitive dependencies** (R3): 8 packages are pinned in `requirements.txt`, but 31 are
installed in the venv, and the unpinned ones can change on every fresh install. A lock file (for example `pip-compile` or
`uv lock`) makes every future build, test run and SCA check reproducible, which matters more than any single
feature defect. It is a dependency-tooling change, so it needs the human's approval first (AGENTS.md §8).
The small follow-ups F6 and F7 come after it.
