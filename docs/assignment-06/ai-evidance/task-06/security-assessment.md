# Task 06 — Security assessment: budget check (code-based and Appsmith)

All checks ran only against services I started myself on `localhost` with a throwaway SQLite DB and fictional
data. No external system was scanned. Raw output: `screenshots/sast.png`, `screenshots/dast.png`, `screenshots/sca.png`, `screenshots/ui-run-xss.png`,
`screenshots/d2-xss-row.png`.

## 1. Threat model

**Assets.** (A1) expense records of the user (personal spending habits — sensitive in a real deployment, fictional
here); (A2) correctness of the budget answer (a wrong "within budget" leads to overspending); (A3) availability of
the API; (A4) the developer machine and repository the AI agent works in (files, git history, credentials in the
shell environment); (A5) the Appsmith instance and its admin account.

**Trust boundaries.**

```
[Browser: React app]  --HTTP, CORS: only http://localhost:5173-->  [FastAPI :8000] --SQLAlchemy--> [SQLite file]
[Browser: Appsmith UI] --> [Appsmith server in Docker :8080] --REST, server-side--> host.docker.internal:8000
[AI agent (Claude Code)] --shell / file edits / network tools--> [repository + developer machine]
```
B1 browser ↔ API (untrusted input crosses here); B2 Appsmith server ↔ API (server-side calls, not limited by CORS);
B3 AI agent ↔ repository/machine (agent reads untrusted text: the assignment PDF, third-party docs, data).

**Attack surfaces.** `GET /api/budget-check` query string (`month`, `category`, `limit`); existing CRUD endpoints
(free-text `description`); the React rendering of stored text; Appsmith widgets, JS Object and REST query; npm and
PyPI dependencies; the agent's tools and the text it reads.

**Likely misuse.** (M1) malformed or extreme parameters to crash the API or get a wrong status (found in review:
F1/F2); (M2) SQL injection through `category`/`month`; (M3) stored XSS through `description`, shown in the table;
(M4) another web site calling the API from the victim's browser (CORS); (M5) a vulnerable dependency;
(M6) an Appsmith app shared publicly, exposing the expense list; (M7) prompt injection — text in a document,
dependency docs or a stored expense telling the agent to run commands, push, or leak data.

## 2. SAST, DAST and SCA — what they are and what was run

| Kind | Meaning | Applied here | Result |
|---|---|---|---|
| **SAST** (static application security testing) | inspect source code without running it, looking for dangerous patterns | `ruff check --select S app` (flake8-bandit rules, built into the pinned ruff — nothing installed); grep for `dangerouslySetInnerHTML`, `innerHTML`, `eval(`, `new Function` in `frontend/src`; grep for raw SQL (`text(`, `execute(`, f-string SQL) in `backend/app`; secrets: tracked `.env`/`.db`/keys, `git grep` for `api_key/secret/password/token =` | 0 findings in `app/` (34 × S101 `assert` only in tests — expected for pytest); no HTML injection sinks; no raw SQL (all queries via `select()` with bound parameters); no secrets or `.env`/`.db` tracked |
| **DAST** (dynamic application security testing) | send crafted but safe requests to the *running* app and observe behaviour | curl to `localhost:8000` (D1–D6) + headless Chrome for the XSS rendering check | see §3 |
| **SCA** (software composition analysis) | check third-party dependencies for known vulnerabilities and licence/pinning problems | `npm audit` (frontend lockfile); OSV.dev `querybatch` for the 8 pinned packages in `requirements.txt` and all 31 installed Python packages (only names + versions are sent) | npm: `found 0 vulnerabilities`; PyPI: 0 known vulnerabilities in 8 direct and 31 installed packages. Gap: Python transitive dependencies are not locked (31 installed vs 8 pinned) |

## 3. DAST results (`screenshots/dast.png`)

| ID | Check | Observed | Verdict |
|---|---|---|---|
| D1 | SQL-injection-like values: `month=2025-03' OR 1=1--`, `category=food' OR '1'='1`; `limit=1e309`, `NaN`, `inf`; unknown param `extra=1` | all HTTP 422 with a validation message; nothing reaches SQL | Pass |
| D1b | Review F1/F2 values `0.004`, `79.996`, `1e-310` | before fix: 200 with wrong status / `percent_used: null`; after fix: 422 (`task-05/repro-f1-f2-*.txt`) | Fixed |
| D2 | Stored XSS: expense with description `<img src=x onerror=alert(1)>` | API stores it as text (201); the table shows the literal text, 0 `<img>` elements created in the grid (`screenshots/ui-run-xss.png`, `screenshots/d2-xss-row.png`). React escapes text; the budget card shows no user text at all | Pass |
| D3 | CORS from `Origin: http://evil.example` | no `Access-Control-Allow-Origin` header; for `http://localhost:5173` → header present | Pass |
| D4 | `POST` / `DELETE` on `/api/budget-check` | 405 Method Not Allowed — the endpoint is read-only | Pass |
| D5 | 100 000-character `month` | HTTP 400 from the server (request line too long) in 4 ms, no crash | Pass |
| D6 | Error responses | short JSON `detail`, no stack traces (FastAPI default, debug off) | Pass |

## 4. Security checklist

| # | Item | Code-based | Appsmith | Evidence / note |
|---|---|---|---|---|
| S1 | Server-side input validation | Yes — Pydantic query model, enum, regex, range, whole cents, `extra="forbid"` | Partial — validation runs in the JS Object in the browser; Appsmith calls only the existing list endpoint, which has its own server validation | `schemas.py`, D1 |
| S2 | Output encoding / XSS | Yes — React text rendering, no `dangerouslySetInnerHTML` | No user text is displayed (numbers and fixed labels only); widget HTML rendering not tested | D2, SAST grep |
| S3 | Injection (SQL) | Yes — ORM `select()` with bound parameters, no raw SQL | Uses the REST API, no direct DB access | SAST grep, D1 |
| S4 | Read-only feature | Yes — GET only, 405 for other methods, TC10 count unchanged | Yes — only a GET query | D4, TC10 |
| S5 | CORS / origin control | Yes — only `http://localhost:5173` | Not applicable — Appsmith calls the API server-side, CORS does not protect this path | D3 |
| S6 | Authentication / authorisation | **No** — the API has no auth (existing design of the learning app, bound to 127.0.0.1 by default) | Appsmith login required for the editor; app visibility must stay *private* | residual risk R1 |
| S7 | Public sharing | Not deployed | Do **not** enable "Make application public": it would expose the expense list to anyone with the link | build guide §6 |
| S8 | Secrets | None in code or repo; `.env` git-ignored | Local admin (fictional email) password kept outside the repo; export JSON contains no credentials (grep) | `screenshots/sast.png`, `task-03/budget-check-appsmith.json` |
| S9 | Dependencies | 0 known vulns (npm, PyPI); Python transitive deps not locked | Appsmith CE v2.7.2, image pinned by digest `sha256:1f456089…` in the build guide; image itself not scanned | `screenshots/sca.png`, build guide |
| S10 | Error handling without leaks | Yes — short messages, UI shows a Russian message | `ErrorText` shows a fixed message | D6, TC11 |
| S11 | Privacy of data in tests | Only fictional fixture data; throwaway DB; real `backend/expenses.db` never touched | Same backend/DB | `task-01` §4 |

## 5. Appsmith-specific notes

- The Appsmith server makes the REST call itself (server-side), so CORS does not limit it; anybody who can use the
  Appsmith app can read the expense list through it. Keep the app private and the admin account local.
- The JS Object runs in the user's browser: client-side validation in Appsmith can be bypassed, which is acceptable
  only because the feature is read-only and the API validates its own inputs.
- Telemetry disabled with `APPSMITH_DISABLE_TELEMETRY=true` (build guide §2).
- Export JSON checked: `grep -iE "password|secret|token|apikey|authorization|bearer|admin"` → no matches.
- Requests from the Appsmith container reach the host's `127.0.0.1:8000` through Docker Desktop
  (`task-03/screenshots/backend-log-appsmith.png`): binding the API to localhost does **not** isolate it from local containers.
- Not verified: how Appsmith Text widgets render stored HTML (the budget app shows no user-entered text, only
  numbers and fixed labels, so D2 does not apply to it).

## 6. Agent / tool permissions and prompt-injection exposure

| Aspect | Observation | Control in place |
|---|---|---|
| Tools of the agent | Claude Code had shell (Bash), file read/write/edit, web fetch, a sub-agent (`/code-review`), MCP connectors (Gmail, Google Drive, Calendar — not authenticated; Figma; Claude Docs). Shell runs with the student's OS permissions. | AGENTS.md §4 safe commands, §7 forbidden actions (no `rm -rf`, no push to `main`, no dependency changes), §8 approvals; work on branch `feature/budget-check`; nothing committed or pushed without the student's request |
| Network use by the agent | `npm audit` (dependency list to npm registry) and OSV.dev queries (package names/versions only); no project data, no personal data sent | Recorded in `screenshots/sca.png`; no downloads or installs were made (Node came from the existing nvm) |
| Untrusted text the agent read | (1) the assignment PDF; (2) the generated HeroUI block in AGENTS.md, which says "If docs missing, run this command first: heroui agents-md …" (a network command that rewrites AGENTS.md); (3) stored expense descriptions such as the XSS payload; (4) the reviewer sub-agent's report | Treated as data: the HeroUI regeneration command was **not** run (AGENTS.md §8 requires approval); stored text was never executed; every reviewer claim was re-verified (one false claim found: "no remote") |
| Sub-agent permissions | The review sub-agent had the same tools but was asked for a read-only review without `--fix` | `git diff --stat` unchanged by the review; findings applied only after human-visible verification |
| Destructive operations | Servers started/stopped by the agent only on ports 8000/5173 it started; throwaway DB in the session scratchpad; `seed.py` not run | AGENTS.md §7–8 |

Prompt-injection exposure is **moderate**: the agent reads third-party docs and repository data and has a shell.
The main safeguards are the explicit forbidden/approval lists, branch isolation, and human review of every diff.
A remaining gap: there is no technical sandbox that blocks a command, only the agent's rules and the Claude Code
permission mode chosen by the user.

## 7. Residual security risks

| ID | Risk | Likelihood / impact | Mitigation / next step |
|---|---|---|---|
| R1 | No authentication on the API (pre-existing) — anyone who can reach port 8000 reads all expenses | Low on localhost / High if exposed | Keep bound to 127.0.0.1; add auth before any deployment |
| R2 | Appsmith app made public by mistake exposes the expense list | Low / High | Keep private; check sharing settings before demo |
| R3 | Python transitive dependencies not locked | Medium / Medium | Add a lock file (`pip-compile` / `uv lock`) — needs approval (dependency change) |
| R4 | Extra CORS preflight per new URL (F7) — performance, not security | High / Low | Send `Content-Type` only with a body in `api.js` (separate task) |
| R5 | Prompt injection through read documents could make an agent run a command | Low / High | Keep AGENTS.md approvals; use a restricted permission mode for unattended runs |
