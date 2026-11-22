# Prompt — Task 02: AGENTS.md

- Date: 2026-11-22
- Agent: Claude Code (model Claude Opus 5.5, `claude-opus-5-5`)
- Repository: Expense Tracker, branch `main`, commit `3bcb0bc baseline`
- Context: earlier in the same session the agent generated the project, moved the UI to HeroUI v3 and added a dark theme.

Prompt text (verbatim, as given to the agent):

```text
Study this repository and create an AGENTS.md file in its root — instructions for AI agents
that will work on this project. If AGENTS.md already exists, extend and correct it.

## Step 1. Inspect the project (read-only)
- folder structure, backend and frontend entry points;
- backend: app/*, tests/*, requirements.txt, seed.py;
- frontend: src/*, package.json, Vite/Vitest/Tailwind configs;
- README.md, .gitignore, .env.example (if present);
- where validation, business logic, summary calculation and HTTP calls live,
  how tests isolate the database, which environment variables are used.

## Step 2. Run safe checks and record the actual output
cd backend && pytest -q
cd frontend && npm test && npm run build
Also check whether ruff, mypy and npm run lint are configured (do not install them, only check).

## Step 3. Write AGENTS.md with the following sections
1. Purpose — what the project does (2–3 sentences).
2. Architecture — annotated file tree, data flow, where each kind of logic must live.
3. Setup — exact install and run commands for backend and frontend.
4. Safe commands — commands the agent may run without asking, with the actual
   baseline result of each; separately list what is not configured yet.
5. Coding conventions — Python and React style, where validation goes, rules for the
   UI libraries and styling actually used in the project.
6. Test expectations — every change comes with a test; run all tests and the build
   before finishing; never delete, skip or weaken tests; never report results
   that were not actually produced.
7. Forbidden actions — at minimum:
   - no secrets, keys, passwords or .env files in commits; fictional data only;
   - no deployments or hosting changes;
   - no destructive commands (rm -rf, deleting the DB, git reset --hard,
     git push --force, rewriting history);
   - no adding, removing or upgrading dependencies without human approval;
   - no changes outside the task scope; no push/merge to main.
8. Actions requiring human approval — dependency changes, DB schema, CORS,
   API contracts, deleting files.
9. Review gates — what the agent must provide before review: summary, diff,
   test and build output, risks and unverified items; a human approves every diff.

## Constraints
- Create or modify ONLY AGENTS.md. Do not touch any other file.
- Do not install or upgrade anything; do not commit or push.
- Write only what is confirmed by the code or command output. If something
  could not be verified, say so explicitly.

## Response format
1. A short list of what you found in the project (with file paths).
2. The full text of AGENTS.md.
3. The actual output of the commands you ran.
4. What you could not verify.
```
