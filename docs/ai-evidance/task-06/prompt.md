# Prompt — Task 06: agent-readiness audit

- Date: 2026-11-22
- Agent: Claude Code (model Claude Opus 5.5, `claude-opus-5-5`)
- Repository: Expense Tracker, branch `refactor/summary-categories-from-server`, commit `d4e7549` (clean working tree); `main` at `93f048e`

Prompt text (verbatim, as given to the agent):

```text
Read AGENTS.md first and follow it.

Task: perform a READ-ONLY agent-readiness audit of this repository. Do not modify any files.

Evaluate each criterion below as Pass / Partial / Fail, with concrete evidence
(file path, line, or a command I should run to confirm):
1. Readable project structure
2. README accuracy (do documented commands match package.json / actual files?)
3. Reproducible setup (exact steps, lock files, environment instructions)
4. Pinned dependencies (backend and frontend)
5. Automated tests (backend and frontend; what is and isn't covered)
6. Lint and type checks
7. Build command
8. Logging
9. Security safeguards (.gitignore for .env/*.db, CORS, secrets handling)
10. AGENTS.md: permissions, safe commands, prohibited actions, review gates

Then suggest a readiness level: 1 Baseline, 2 Documented, or 3 Agent-ready,
and list the missing evidence needed to reach the next level.
Do not invent command output; give me commands to run instead.
```
