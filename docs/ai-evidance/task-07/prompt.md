# Prompt — Task 07: corrective actions for the top risks

- Date: 2026-11-22
- Agent: Claude Code (model Claude Opus 5.5, `claude-opus-5-5`)
- Repository: Expense Tracker, branch `refactor/summary-categories-from-server`, starting commit `c989958`
- Task 07 was given in three prompts: (A) mitigate R1 — no lint checks, (B) mitigate R6 — weak frontend
  test coverage, (C) fix the items left open by part A.

## Part A — R1: lint checks (verbatim)

```text
Read AGENTS.md first and follow it.

Task: mitigate risk R1 (no lint checks). Make a MINIMAL change.

Approved by human for this task only: add these dev dependencies —
ruff (backend, add to requirements.txt with a pinned == version) and
eslint with the minimal plugins needed for React (frontend devDependencies).
No other dependency changes are allowed.

1. Backend: add a minimal ruff configuration (pyproject.toml or ruff.toml).
2. Frontend: add a minimal ESLint config for React and a "lint" script in package.json.
3. Run ruff check . and npm run lint. If they report issues in existing code,
   fix only trivial ones (unused imports, etc.); list anything else instead of fixing it.
4. Run all checks: pytest -q ; npm test ; npm run build.
5. Respond with: summary, full git diff, actual output of every command,
   and anything you did not fix.
```

## Part B — R6: frontend test coverage (verbatim)

```text
Read AGENTS.md first and follow it.

Task: mitigate risk R6 (weak frontend test coverage). Do NOT change application
code and do NOT add dependencies — use the existing Vitest + React Testing Library setup.

1. Add targeted tests for:
   - deleting an expense (the API call is made and the item disappears from the list);
   - displaying an error message when the API request fails.
   Mock the functions in src/api.js; do not call a real backend.
2. Tests must be meaningful: each must fail if the behavior is broken.
3. Run: npm test ; npm run build ; cd ../backend && pytest -q
4. Respond with: summary, full git diff, actual command output.
```

## Part C — fix the remaining items (verbatim)

The user wrote "fix" and pasted the "Not fixed" list from the agent's Part A response:

```text
fix

1. frontend/src/App.jsx:57 — react-hooks/set-state-in-effect (error), so npm run lint exits 1.
   - The effect calls loadData(), which immediately runs setIsLoading(true) and setError(""). That isn't trivial: fixing it means restructuring how the page loads data, which is a behaviour change.
   - I also didn't disable the rule, since that would weaken the new check. Options for you to choose from:
     - (a) Refactor: start with isLoading already true, set the loading state in the filter's onChange handler, and keep the effect free of synchronous setState.
     - (b) Disable the rule for that one line with an eslint-disable-next-line comment explaining why.
2. AGENTS.md is out of date. §4 still lists ruff and ESLint as "Not configured yet", and the safe-commands table has no ruff check . / npm run lint rows. I left it alone to keep this change minimal; it's the next update to make.
3. README doesn't document the lint commands.
4. No type checking: mypy wasn't part of this approval.
5. React-specific JSX rules aren't checked (for example a missing key in lists), because eslint-plugin-react doesn't support ESLint 10 yet.
6. Globals are listed by hand in eslint.config.js. Code that starts using another browser API, such as localStorage or setTimeout, will need that name added there.
7. ruff sits in the same requirements.txt as the runtime dependencies, so a production install also gets it; the file had no separate dev section to put it in.
```
