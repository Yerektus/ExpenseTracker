# Prompt — Task 03: maintainability analysis and refactoring

- Date: 2026-11-22
- Agent: Claude Code (model Claude Opus 5.5, `claude-opus-5-5`)
- Repository: Expense Tracker, commit `93f048e docs: add AGENTS.md and AI evidence`
- Branch for the change: `refactor/summary-categories-from-server` (created from `main`, per AGENTS.md §7)

Task 03 was given in two prompts: a read-only analysis, then the implementation of the recommended change.

## Part 1 — analysis (verbatim)

```text
Read AGENTS.md first and follow it.

Task: identify ONE maintainability problem in this repository and decide whether
a design pattern is justified. This is a READ-ONLY analysis — do not modify any files.

1. Look for concrete problems such as:
   - duplicated conditionals (e.g. if/elif chains over categories or filters);
   - business logic mixed into routers or React components;
   - tightly coupled dependencies (direct DB/HTTP calls where they don't belong).
2. For the single most important problem, show the exact file paths and code fragments.
3. Evaluate a small pattern (Strategy, Adapter, or another fitting one):
   - what concrete problem it would solve;
   - what it would cost (more files, indirection);
   - whether a simpler refactoring (extract function, constant, dictionary) is enough;
   - your recommendation: apply a pattern, apply a simpler refactoring, or change nothing.
4. If you recommend a change, describe the before/after structure and list which
   existing tests cover it and which new test should be added.

Do not invent problems. If the code is already clean enough, say so honestly.
```

## Part 2 — implementation (verbatim)

```text
Implement exactly the refactoring you recommended — ONE focused change only.
- Follow AGENTS.md (no dependency changes, no unrelated edits).
- Behavior must not change; add or update a targeted test if needed.
- Then run: cd backend && pytest -q ; cd frontend && npm test && npm run build
- Respond with: summary, full git diff, actual command output,
  and a before/after structure comparison.
```
