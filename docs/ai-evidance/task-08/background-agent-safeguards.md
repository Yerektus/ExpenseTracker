# Background agent safeguards (Task 08)

This is a hypothetical design. No paid background-agent service was used.
Facts it relies on were checked against the repository on 2026-11-22 (see section 10).

## 1. Task
Asynchronous agent task: **fix R19** (new risk, not yet in `task-05/risk-register.md`; R9 there is the float-amount
rounding risk) — when loading fails after a filter change, the previous (unfiltered) list stays visible under the new
filter.

Evidence:
- `docs/ai-evidance/task-07/screenshots/10-app-load-error.png` — filter «Еда» is selected, the load-error banner is shown,
  and the table still lists 3 expenses of all categories («Расходы 3»).
- Code: in `frontend/src/App.jsx` the load effect's `.catch` only calls `setError(...)`; `expenses` keeps the previous list.
- Reproduced with a scratch test on commit `22f9552`: after the user picks «Еда» and `fetchExpenses` rejects, the alert is
  shown and the row «Такси до вокзала» (transport) is still in the table → `Tests 1 passed`, i.e. the stale row is present.

Expected result: on load error the list is cleared or clearly marked as stale, and a new test in
`ExpenseActions.test.jsx` covers this case (it must fail on the current code and pass after the fix).

## 2. Isolation
- **Precondition:** `main` must contain Task 07. Today `main` is at `93f048e`, which has no `ExpenseActions.test.jsx`,
  no ESLint config and no `lint` script, and only 2 frontend tests. A human first reviews and merges
  `refactor/summary-categories-from-server` (`22f9552`) into `main`.
- Dedicated branch and worktree created from that updated `main`:
  `git worktree add ../et-agent-r19 -b agent/fix-r19-stale-list main`
- The agent works only inside `../et-agent-r19`; the main working copy and the `main` branch are never touched.
- Git-ignored files do not exist in a new worktree: `frontend/node_modules`, `backend/.venv`, `.env`,
  `backend/expenses.db`. Tests use mocks only, so no database or `.env` is needed.
- Frontend dependencies are installed **only** from the committed lock file and the local npm cache:
  `cd frontend && npm ci --offline --ignore-scripts` (no network, no dependency changes; `package-lock.json` must stay
  unchanged). Requires Node.js ≥ 22.12 (Vitest 5).

## 3. Allowed files
| Access | Paths |
|---|---|
| Modify | `frontend/src/App.jsx`, `frontend/src/__tests__/ExpenseActions.test.jsx` |
| Read-only | everything else in the repository, including AGENTS.md and DESIGN.md |
| Forbidden | `package.json`, `package-lock.json`, `requirements.txt`, configs (`eslint.config.js`, `vite.config.js`, `ruff.toml`, `pytest.ini`), `src/setupTests.js`, `AGENTS.md`, `backend/**`, `docs/**` |

Any change outside the "Modify" list fails the task automatically
(checked with `git diff --name-only main...agent/fix-r19-stale-list`; the output must contain only the two allowed paths).

## 4. Allowed commands
- `npm ci --offline --ignore-scripts` (setup only, once)
- `npm test`, `npx vitest run src/__tests__/ExpenseActions.test.jsx`, `npm run lint`, `npm run build` (in `frontend/`)
- `git status`, `git diff`, `git add`, `git commit` (only on `agent/fix-r19-stale-list`; this task spec is the human's
  explicit permission to commit required by AGENTS.md §7)

## 5. Limits
- Time limit: 30 minutes wall-clock.
- At most 3 fix-and-test iterations; then stop and report.
- No network access except the local npm cache; no package installation beyond `npm ci --offline` from the lock file.

## 6. Prohibited operations
- Installing, removing or upgrading dependencies; changing `package-lock.json`
- Editing files outside the allowed list, AGENTS.md, lint or test configs
- Disabling lint rules (`eslint-disable`, `// noqa`) or skipping/weakening tests (`test.skip`, `it.skip`, `.only`,
  removing or loosening assertions, broadening mocks)
- `git push` to `main`, merge, rebase, force push, history rewrite
- Destructive commands (`rm -rf`, `git reset --hard`, `git clean -fd`)
- Reading or creating secrets / `.env`; running `seed.py`; any deployment

## 7. Required artifacts
The agent must hand over:
1. **Change summary** — what was changed and why (3–5 lines)
2. **Diff** — `git diff main...agent/fix-r19-stale-list` and `git diff --name-only main...agent/fix-r19-stale-list`
3. **Test logs** — full `npm test` output with pass/fail totals (baseline after Task 07: Test Files 4 passed, Tests 8 passed),
   plus the new test's output **before** the fix (must fail) and **after** the fix (must pass)
4. **Lint and build results** — `npm run lint` exit code (baseline: 0), `npm run build` output (baseline: built, chunk > 500 kB warning)
5. **Risk notes** — assumptions (cleared list vs "stale" marker), cases not covered, anything not executed

## 8. Human review and approval
1. A human reads the diff and checks that only allowed files changed.
2. A human re-runs all five checks locally in a full checkout (with `backend/.venv`): `ruff check .`, `pytest -q`,
   `npm run lint`, `npm test`, `npm run build`. Backend checks must be unchanged (8 passed), since `backend/**` is forbidden.
3. A human verifies the new test is meaningful: temporarily revert the fix → the test must fail.
4. Merge to `main` only after explicit human approval. Deployment is out of scope.

## 9. Failure and rollback
All rollback commands are run by the **human**, not the agent (AGENTS.md §7 forbids destructive commands for agents).

| Situation | Action |
|---|---|
| Tests still fail after 3 iterations or time limit reached | Agent stops and reports logs; branch kept for inspection; nothing merged |
| Change outside allowed files, disabled rule or skipped test | Reject; human deletes worktree and branch (`git worktree remove ../et-agent-r19`, `git branch -D agent/fix-r19-stale-list`) |
| `package-lock.json` changed by `npm ci` | Stop; report; nothing merged (indicates a lock/cache mismatch) |
| Human review rejects the approach | Same as the reject row; task re-specified and restarted |
| Problem found after merge | `git revert <merge commit>` (no history rewrite), re-run all five checks |

## 10. Verification notes (what was checked before saving this design)

| Claim in the draft | Check | Result |
|---|---|---|
| "fix R9" | `task-05/risk-register.md` | R9 is the float-rounding risk → renamed to **R19** |
| Evidence `docs/screenshots/task-07/10-app-load-error.png` | `ls` | Path does not exist; real path `docs/ai-evidance/task-07/screenshots/10-app-load-error.png` |
| The bug exists | Screenshot + scratch test on `22f9552` | Confirmed: stale transport row visible under «Еда» after a failed load |
| Worktree "from the latest `main`" | `git branch -v`, `git ls-tree main frontend/src/__tests__/` | `main` = `93f048e`: only `App.test.jsx`, `ExpenseForm.test.jsx`; no `ExpenseActions.test.jsx`, no `lint` script → precondition added (merge Task 07 first) |
| Baseline "8 passed" | `npm test` on a clean copy of `22f9552` | `Test Files 4 passed (4)`, `Tests 8 passed (8)` (true only after Task 07 is in `main`) |
| Worktree has what it needs | `git check-ignore` | `node_modules`, `.venv`, `.env`, `expenses.db` are ignored → absent in a new worktree |
| "No package installation" vs running tests | `npm ci --offline --ignore-scripts` on a clean copy of `22f9552` | Installed 262 packages from the local cache with no network; `package-lock.json` unchanged; `npm test` 8 passed; `npm run lint` exit 0 |
| `it.skip` as the skip pattern | test files | Project tests use `test(...)` → also forbid `test.skip` / `.only` |
| Who deletes branch/worktree | AGENTS.md §7 | Destructive commands are forbidden for agents → rollback assigned to the human |
| Agent may `git commit` | AGENTS.md §7 ("commit only when a human asks") | Allowed only because this spec explicitly asks for it, and only on the agent branch |

Not executed: the worktree, the agent branch and the fix itself were **not** created — this document is a design only.
