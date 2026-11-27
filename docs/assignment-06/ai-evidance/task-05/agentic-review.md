# Task 05 — Agentic code review of the code-based implementation

## 1. How the review was run

| Item | Value |
|---|---|
| Reviewer | Claude Code built-in `/code-review` skill, effort `high`, run as a separate forked agent (Claude Opus 5.5) |
| Date | 2026-11-27, 16:47–16:49 |
| Scope | uncommitted diff of `feature/budget-check` (`git diff HEAD` + untracked `BudgetCheck.jsx`, `BudgetCheck.test.jsx`) |
| Mode | **read-only**: no `--fix`, no `--comment`; the reviewer made no file changes (`git diff --stat` identical before/after) |
| Focus asked | correctness, security, maintainability, testing, failure handling |
| Verification | done afterwards by the main agent and the student: curl against a throwaway DB, failing tests written *before* the fix, mutation check, real-browser run |

Prompt: `/code-review high` (the skill's built-in review instructions; target = current diff).

## 2. Reviewer output (verbatim summary + findings)

> I found 6 issues in the uncommitted `feature/budget-check` changes: 4 important and 2 nits.
> `git diff origin/HEAD...HEAD` failed because the repo has no remote, so I reviewed `git diff HEAD` plus the
> untracked `BudgetCheck.jsx` and `BudgetCheck.test.jsx`. I checked the first two by calling
> `calculate_budget_check` directly: `([], 0.004)` returned `warning`, `([80], 79.996)` returned `remaining: -0.0`
> with `warning`, and `([80], 1e-310)` returned `percent_used: inf`.

| # | File:line | Reviewer severity | Reviewer claim (shortened) |
|---|---|---|---|
| F1 | `backend/app/crud.py:97` | important | A limit below one cent (`0.004`) passes `gt=0`, rounds to 0 cents → status `warning` with nothing spent; `79.996` with 80 spent → `remaining -0.0` and `warning` instead of `over`. |
| F2 | `backend/app/crud.py:109` | important | A tiny positive limit (`1e-310`) makes `percent_used` infinite → 500 or `null`; UI shows `0,0 %` next to "over". |
| F3 | `frontend/src/components/BudgetCheck.jsx:54` | important | After adding/editing/deleting an expense the budget card keeps the old numbers while Summary updates; result is local state, breaks AGENTS.md §5 "state lives in App.jsx". |
| F4 | `frontend/src/components/BudgetCheck.jsx:76` | important | No stale-response guard: pressing Enter while a check is pending submits again, and an older response can overwrite the newer one. |
| F5 | `backend/app/crud.py:109` | nit | `percent_used` (1 decimal) can disagree with the status: `100,0 %` with `over`, `0,0 %` with 80 spent. |
| F6 | `frontend/src/components/BudgetCheck.jsx:170` | nit | An unknown `status` value makes `status.color` throw and blanks the whole app (no error boundary). |

One additional candidate was found by the main agent during the UI test run (not by the reviewer):

| # | File:line | Claim |
|---|---|---|
| F7 | `frontend/src/api.js:23` | Every GET sends `Content-Type: application/json`, so the browser makes a CORS preflight `OPTIONS` before each new URL (one extra round trip per check). |

## 3. Verification and classification

Legend: **Confirmed** — reproduced with code location + test/command output; **Plausible / unverified** — the
code path exists but the claimed failure could not be reproduced; **Unsupported** — the claim does not hold or is
not a defect against the contract.

| # | Classification | Evidence | Action |
|---|---|---|---|
| F1 | **Confirmed** | `screenshots/repro-f1-f2-before.png`: `limit=0.004` → `"spent":0.0,…,"status":"warning"` HTTP 200; `limit=79.996` → `"remaining":-0.0,…,"status":"warning"` HTTP 200 | **Fixed** (fix 1) |
| F2 | **Confirmed** (partly) | `screenshots/repro-f1-f2-before.png`: `limit=1e-310` → HTTP 200 with `"percent_used":null` and `"status":"over"`. No 500: Pydantic serialised `inf` as `null`. The UI would render `Number(null)` → `0,0 %` next to «Бюджет превышен». | **Fixed** (fix 1) |
| F3 | **Confirmed** | New test `BudgetCheckApp.test.jsx` «после добавления расхода проверка бюджета пересчитывается…» failed on the old code (card stayed `80,00`), passes after the fix; mutation M1 in `screenshots/mutation-check.png` (remove `reloadCount` from the effect deps) makes it fail again; real browser: `screenshots/ui-run-f3.png`, `screenshots/f3-before.png` (0,00) → `f3-after.png` (30,00 after adding an expense) | **Fixed** (fix 2) |
| F4 | **Plausible / unverified** | True that the old component had no ignore flag. But the trigger did not reproduce: a probe test showed Enter submits when idle (1 call) and does **not** submit while pending — the HeroUI button is `aria-disabled="true"`, `data-pending="true"` (`pendingCalls=1`). Not tested in a real browser with a slow backend. | No separate fix; after fix 2 the request runs in an App effect with an `ignore` flag (same pattern as the list loading), which removes the race by construction. The draft F4 test was deleted because its trigger is unreachable. |
| F5 | **Unsupported** (as a defect) | The contract (task-01 §2) defines `percent_used` rounded to 1 decimal and the status by exact cents; TC04 (`100,0 %` + «Бюджет превышен») and TC07a (`0,0 %` with 80,00 spent) expect exactly this. The status chip and the negative «Осталось» make the state unambiguous. | Not changed; noted as a UX idea (show `>100 %`). |
| F6 | **Plausible / unverified** | Code path is real (`BUDGET_STATUSES[result.status]` → `undefined.color`), but unreachable now: `response_model=BudgetCheck` restricts `status` to the `BudgetStatus` enum (`ok`/`warning`/`over`), and both sides are changed together. | Not fixed; listed as a limitation (task-08). |
| F7 | **Confirmed** (pre-existing) | `screenshots/f7-preflight-log.png` (uvicorn access log during the UI run): `OPTIONS /api/budget-check?…limit=79.99 200` followed by `GET …` for every new URL; repeated identical URL (TC10) → GET only (preflight cached). Code: `api.js` `request()` sets `Content-Type` for every method. | Not fixed: affects every API call, not only the feature; out of scope (AGENTS.md §7). Recorded as a follow-up. |

Incorrect statement by the reviewer: *"the repo has no remote"*. `git remote -v` shows `origin`; the real reason
the command failed is that `origin/HEAD` is not set (`git rev-parse --verify origin/HEAD` → `fatal: Needed a single
revision`). It did not affect the findings, because the reviewer fell back to `git diff HEAD`.

Result: 7 candidates → 4 confirmed (F1, F2, F3, F7), 2 plausible/unverified (F4, F6), 1 unsupported (F5).

## 4. Fixes (two meaningful issues)

### Fix 1 — limit must be at least one cent and in whole cents (F1, F2)

`backend/app/schemas.py`:
```python
    # Не меньше одной копейки: иначе статус и процент считаются от лимита, округлённого до нуля.
    limit: float = Field(ge=0.01, le=1_000_000, description="Лимит бюджета на месяц")

    @field_validator("limit")
    @classmethod
    def limit_has_at_most_two_decimals(cls, value: float) -> float:
        if round(value, 2) != value:
            raise ValueError("Лимит должен быть указан с точностью до копеек")
        return value
```
Client (`validateBudgetInput`): `limit < 0.01` → field error (the NumberField already allows at most 2 decimals).
The same rule was added to the Appsmith JS Object so both implementations keep identical rules.

Tests: `test_budget_check_rejects_invalid_input` + `0.004`, `79.996`, `1e-310`; `test_budget_check_boundaries`
+ `0.01` accepted; `validateBudgetInput` + `0.005` rejected. After the fix (`screenshots/repro-f1-f2-after.png`): `0.004` → 422
"greater than or equal to 0.01", `79.996` → 422 "Лимит должен быть указан с точностью до копеек", `1e-310` → 422,
`0.01` and `79.99` → 200. Mutation M2 (undo the fix) → 3 backend tests fail.

### Fix 2 — budget result is recomputed after data changes (F3; also guards F4)

The check's query, result, error and pending flag moved from `BudgetCheck.jsx` into `App.jsx`. A `useEffect` on
`[budgetQuery, reloadCount]` calls `fetchBudgetCheck`; `setState` happens only in promise callbacks and is skipped
for stale responses (`ignore` flag), exactly like the existing list loading (AGENTS.md §5,
`react-hooks/set-state-in-effect`). `BudgetCheck.jsx` now receives `result`, `error`, `isChecking`, `onCheck`,
`onClear` via props. Every `reloadData()` (after add / edit / delete / «Повторить») re-runs the last check.

Tests: `BudgetCheckApp.test.jsx` (recompute after add; error keeps input and removes old result; repeated check
hits the server). Failing before the fix: the recompute test (`Expected element to have text content: 110,00`).
Mutation M1 → fails again. Real browser: `f3-before.png` / `f3-after.png`.

## 5. Checks after the fixes

`task-08/screenshots/final-checks.png`: `ruff check .` → All checks passed; `pytest -q` → 30 passed, 1 warning (baseline
warning); `npm run lint` → exit 0; `npm test` → 6 files, 17 passed; `npm run build` → built, exit 0 (baseline
chunk warning). The full UI suite (11 cases) and the API suite were re-run on the fixed code: all results unchanged.
