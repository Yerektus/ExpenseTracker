# Prompt — Task 04: read-only risk review

- Date: 2026-11-22
- Agent: Claude Code (model Claude Opus 5.5, `claude-opus-5-5`)
- Repository: Expense Tracker, branch `refactor/summary-categories-from-server`, commit `cd979b5` (clean working tree); `main` at `93f048e`

Prompt text (verbatim, as given to the agent):

```text
Read AGENTS.md first and follow it.

Task: perform a READ-ONLY risk review of this repository. Do NOT modify, create
or delete any files. Do not install anything.

1. Propose at least 8 candidate risks spanning these categories:
   correctness, maintainability, security, dependency, agent operations.
2. For each candidate provide:
   - ID (R1, R2, ...) and category;
   - cause → event → consequence;
   - affected component (file path);
   - evidence: exact file:line and code fragment, or a command that would reproduce it;
   - suggested likelihood (1–3) and impact (1–3);
   - a minimal mitigation.
3. Be honest about uncertainty: mark each candidate as
   "evidence found in code" or "speculative".
4. Do not invent command output. If a risk needs a command to confirm, give me
   the command and I will run it myself.
```
