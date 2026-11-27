# Release decision (Task 09): CONDITIONAL

Reviewed version: commit `90888a2` on branch `refactor/summary-categories-from-server` (application code identical to
`22f9552`, Task 07; `90888a2` only adds the Task 08 design document). Baseline: `3bcb0bc`.
Note: `main` is still at `93f048e` — the reviewed version is not on `main` yet (see condition for R5).

## 1. Test and check evidence (final run on `90888a2`, screenshot `ai-evidance/task-09/screenshots/final-checks.png`)

| Check | Baseline | Final |
|---|---|---|
| `ruff check .` | command not found | All checks passed, exit 0 |
| `pytest -q` | 8 passed, 1 warning | 8 passed, 1 warning (`StarletteDeprecationWarning`), exit 0 |
| `npm run lint` | Missing script "lint" | exit 0, no findings |
| `npm test` | 2 passed (2 files) | 8 passed (4 files) |
| `npm run build` | success, chunk warning | success (exit 0), chunk > 500 kB warning |

Baseline values come from the Task 02 run (`ai-evidance/task-02/screenshots/03-checks.png`, `04-tooling-not-configured.png`).
The same final values were also recorded right after Task 07 (`ai-evidance/task-07/screenshots/08-all-checks.png`).

Test quality: all 9 injected defects (M1–M9) were detected by the new tests, and the control run without defects passed
(`ai-evidance/task-07/screenshots/05-mutation-check.png`).

## 2. Acceptance criteria (verified on the final version)

| ID | Criterion | Status | Evidence |
|---|---|---|---|
| AC1 | Backend tests pass | Holds | `pytest -q`: 8 passed (`final-checks.png`) |
| AC2 | Frontend tests pass | Holds | `npm test`: 8 passed, 4 files (`final-checks.png`) |
| AC3 | Frontend build succeeds | Holds | `npm run build`: exit 0 (`final-checks.png`) |
| AC4 | amount <= 0 is rejected | Holds | `curl` with amount `-100` and `0` → HTTP 422 "Input should be greater than 0"; nothing stored (`GET /api/expenses` → `[]`). Run against a throwaway SQLite DB (`ac4-curl-final.png`) |
| AC5 | Summary totals are correct | Holds | `/api/summary` equals totals recomputed from `/api/expenses` (10 expenses): all 5 categories match, total = 1186.65 (`ac5-summary-final.png`, `ac5-recompute.png`). Read-only GET requests on the local DB; `expenses.db` md5 unchanged |

Screenshots for AC4/AC5 and the final run are in `ai-evidance/task-09/screenshots/`.

## 3. Risk register status

IDs follow `ai-evidance/task-05/risk-register.md` (course-template IDs in brackets). "Score now" is the current
L×I; only risks changed by Tasks 07–08 have a lower score.

| ID | Risk | Score now | State |
|---|---|---|---|
| T1 (R1) | No lint / static checks | 6 → 2 | Mitigated (M1) |
| R18 (R6) | Weak frontend test coverage | 4 → 2 | Mitigated (M2) |
| R1 | README Quick start runs `seed.py`, which deletes all expenses | 6 | **Open** — local data loss if run on a non-empty DB; README warns at the seed step, AGENTS.md §8 requires approval for agents |
| R4 | Unknown category in the DB → `/api/summary` and `/api/expenses` return 500 | 6 | **Open** — only reachable by writing to the DB outside the API |
| R5 | Reviewed work is only on the feature branch; `main` is behind | 6 | **Open** — `main` = `93f048e` |
| R7 | Node.js not installed system-wide on the dev machine | 6 | **Open** — frontend checks ran with a temporary Node binary |
| R2 | AGENTS.md baseline can go stale | 6 → 4 | Partly mitigated (baselines updated in Task 07) |
| T4 / R14 (R4) | Deprecated httpx test client integration | 4 | Open, controlled |
| R3 | HeroUI block in AGENTS.md conflicts with §8 | 4 | Open |
| R6 | README Node requirement too low for Vitest 5 | 4 | Open |
| R8 | No DB migrations | 4 | Open (no schema change planned) |
| T2 (R2) | Unrequested UI libraries, 775 kB bundle | 3 | Accepted |
| R9 | Float amounts: API and UI round differently (`1.005`) | 3 | Open (UI input already limited to 2 decimals) |
| R12 | `Infinity` / huge amounts accepted | 3 | Open (needs a crafted API request) |
| R19 (R9) | Stale list shown after a load error | 2 (L1×I2, proposed) | Open — new, designed for the background agent in Task 08; not yet added to the register |
| R11 | Inline script copies HeroUI's internal theme key | 1 | Open, low |
| R13 | Stale responses after fast filter changes | — | Mitigated as a side effect of Task 07 (`ignore` flag) |
| T3 (R3) | `^` version ranges in package.json | — | Unsupported: lock file committed; install with `npm ci` |
| T5 (R5) | Negative amount accepted | — | Unsupported: validation exists (AC4) |
| R15 / S1 | Open CORS; secrets or DB in git | — | Unsupported: foreign origin rejected; only `.env.example` tracked |

Four open risks still score 6 (R1, R4, R5, R7). R1 is a confirmed data-loss risk, limited to the local development
database and to fictional data. No confirmed security risk is open (R15 and S1 were unsupported; R16 — dependency
audit — is unverified).

## 4. Agent readiness
Level 2 — Documented. Lint and tests now exist and pass, and AGENTS.md defines
safe and forbidden actions and review gates. Level 3 is not reached:
no CI enforces checks and there is no type checking (mypy)
(see "After mitigations" in `ai-evidance/task-06/agent-readiness-audit.md`).

## 5. Decision rationale
- **Not NO-GO:** all five checks pass on the final version, all acceptance criteria AC1–AC5 hold on the final version,
  and both top risks chosen for Task 07 (T1, R18) were mitigated with verified evidence. The app is educational, runs
  locally with fictional data and is not deployed, so the open score-6 risks do not affect real users or real data.
- **Not GO:** known limitations remain without automated enforcement: no CI, a deprecated test dependency, a minor
  stale-data UI issue, and four open score-6 risks (destructive seed step, 500 on an unknown DB category, `main` behind
  the reviewed branch, no system Node.js).
- **CONDITIONAL:** each remaining limitation has an explicit control and an owner (section 6).

## 6. Conditions

| Limitation | Control | Owner | When |
|---|---|---|---|
| R5: reviewed work not on `main` | Human reviews and merges `refactor/summary-categories-from-server` into `main`; re-run all 5 checks on `main` | Yerentalov Yerdos | Before release |
| R7: no system Node.js | Install Node.js LTS ≥ 22.12 and re-run `npm test` / `npm run lint` / `npm run build` with it | Yerentalov Yerdos | Before release |
| R1: `seed.py` deletes all data | Do not run `seed.py` on a non-empty DB; planned fix: `--force` guard + warning inside README Quick start | Yerentalov Yerdos | Next iteration |
| R4: unknown DB category → 500 | No direct DB writes outside the API; planned fix: validate seed rows through `ExpenseCreate` | Yerentalov Yerdos | Next iteration |
| No CI — checks run manually | Run all 5 checks before every merge (AGENTS.md review gates) | Yerentalov Yerdos | Every merge |
| T4 / R14: StarletteDeprecationWarning | Migrate the test client during the next planned dependency upgrade | Yerentalov Yerdos | Next upgrade |
| R19: stale list after load error | Fix via the background-agent task designed in Task 08 | Yerentalov Yerdos | Next iteration |
| T2: large bundle | No new UI libraries without approval (AGENTS.md) | Yerentalov Yerdos | Ongoing |
| No type checking | Add mypy in the next iteration (dependency change → approval) | Yerentalov Yerdos | Next iteration |

Scope: educational app with fictional data only; no production deployment.
