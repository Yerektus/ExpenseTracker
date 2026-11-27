# Task 03 — Low-code implementation in Appsmith (build guide and record)

The same "budget check" feature (contract: `task-01/requirements.md` §2) rebuilt in **Appsmith Community
Edition v2.7.2** (image `appsmith/appsmith-ce`, digest `sha256:1f456089…`), self-hosted in Docker (free, no
subscription). Results of the run: `task-04/test-suite.md` (11 / 11 Pass), `task-04/screenshots/ui-run-lowcode-1.png`, `task-04/screenshots/ui-run-lowcode-2.png`.

**How the app was actually assembled (honest note).** The widgets, the `GetExpenses` query and the `Budget`
JS Object listed in §3–§5 were not dragged in by hand: an empty app was exported from this Appsmith instance,
`gen_appsmith_app.py` added the 15 widgets, the query and the JS Object to that JSON, and the result was imported
through Appsmith's own *Import application* API and deployed. The visual editor was then opened to check that
everything is editable there (`screenshots/01–03`). The final app is exported as `budget-check-appsmith.json`
(no credentials inside, checked with grep). The manual steps below describe the same configuration for someone
who builds it by hand in the editor; that manual path was not timed.

## 1. What is the same and what is different

| Part | Code-based | Appsmith |
|---|---|---|
| Inputs | Month text `ГГГГ-ММ`, category select, limit number | Same three widgets: `MonthInput`, `CategorySelect`, `LimitInput` |
| Data | SQLite via `GET /api/budget-check` | The **same** backend and DB, via the existing `GET /api/expenses?category=…` (REST query `GetExpenses`) |
| Validation | `schemas.py` (server) + `validateBudgetInput()` (UI) | `Budget.validate()` in a JS Object |
| Core logic | `crud.calculate_budget_check()` (Python) | `Budget.calculate()` in the JS Object (month filter, sum, cents comparison) |
| Output | `BudgetCheck.jsx` card | Text widgets + Progress widget bound with `{{ }}` expressions |

Nothing is mocked: the Appsmith app reads real expenses from the running backend. The month filtering and
the status rule are recomputed inside Appsmith (the new `/api/budget-check` endpoint is **not** used, otherwise
the low-code version would only display the code-based result).

## 2. Setup (one time)

1. Start Docker Desktop.
2. Start the backend on a throwaway DB and load the fixture (from the repository root):
   ```bash
   cd backend && source .venv/bin/activate
   DATABASE_URL=sqlite:////tmp/budget-demo.db uvicorn app.main:app --port 8000
   # second terminal, repository root:
   backend/.venv/bin/python docs/assignment-06/demo/load_fixture.py http://localhost:8000
   ```
3. Start Appsmith CE (downloads the `appsmith/appsmith-ce` image, ~2 GB; data kept outside the repository):
   ```bash
   docker run -d --name appsmith -p 8080:80 \
     -e APPSMITH_DISABLE_TELEMETRY=true \
     -v "$HOME/appsmith-stacks:/appsmith-stacks" appsmith/appsmith-ce
   ```
   Open http://localhost:8080 (first start takes 1–3 minutes), create the local admin account
   (fictional name, any local password — it never leaves the machine and is not written into the report).
4. Create a new application **Budget check**.

## 3. Datasource and query

1. *Queries/JS → + New query/API → REST API*, name it `GetExpenses`.
2. Method `GET`, URL: `http://host.docker.internal:8000/api/expenses`
   (inside the container `localhost` is the container itself; `host.docker.internal` is the Mac).
3. *Params*: key `category`, value `{{CategorySelect.selectedOptionValue}}`.
4. *Settings*: "Run query on page load" = **off** (it runs only from the button).
5. Click *Run* once with the backend up: the response must be a JSON list of food expenses.

## 4. JS Object

*Queries/JS → + New JS Object*, rename to `Budget`, replace the content with `Budget.jsobject.js` from this
folder. It contains `validate()`, `calculate()`, `check()` and two formatters.

## 5. Widgets (drag from the Widgets panel, set the properties)

| Widget | Name | Properties |
|---|---|---|
| Text | `Title` | Text: `Проверка бюджета`; below it a Text `Сколько потрачено в категории за месяц` |
| Input | `MonthInput` | Data type: Text · Label: `Месяц` · Placeholder: `ГГГГ-ММ` · Required: on |
| Text | `MonthError` | Text: `{{appsmith.store.budgetErrors?.month ?? ""}}` · Text color: red |
| Select | `CategorySelect` | Label: `Категория` · Default selected value: `food` · Source data (JSON): `[{"label":"Еда","value":"food"},{"label":"Транспорт","value":"transport"},{"label":"Развлечения","value":"entertainment"},{"label":"Коммунальные услуги","value":"utilities"},{"label":"Другое","value":"other"}]` |
| Input | `LimitInput` | Data type: Number · Label: `Лимит на месяц` · Required: on |
| Text | `LimitError` | Text: `{{appsmith.store.budgetErrors?.limit ?? ""}}` · Text color: red |
| Button | `CheckButton` | Label: `Проверить` · onClick: `{{Budget.check()}}` |
| Text | `ErrorText` | Visible: `{{!!appsmith.store.budgetError}}` · Text: `Не удалось проверить бюджет. {{appsmith.store.budgetError}}` · red |
| Container | `ResultBox` | Visible: `{{!!appsmith.store.budgetResult}}` — the widgets below go inside it |
| Text | `StatusText` | Text: `{{Budget.STATUSES[appsmith.store.budgetResult?.status]?.label}}` · Text color: `{{Budget.STATUSES[appsmith.store.budgetResult?.status]?.color}}` |
| Progress | `UsedProgress` | Progress: `{{Math.min(appsmith.store.budgetResult?.percent_used ?? 0, 100)}}` · Show result: on |
| Text | `PercentText` | `Использовано: {{Budget.formatPercent(appsmith.store.budgetResult?.percent_used ?? 0)}}` |
| Text | `SpentText` | `Потрачено: {{Budget.formatAmount(appsmith.store.budgetResult?.spent ?? 0)}}` |
| Text | `RemainingText` | `Осталось: {{Budget.formatAmount(appsmith.store.budgetResult?.remaining ?? 0)}}` |

Then *Deploy* and run the cases of `task-04/test-suite.md` in the deployed app (View mode).

## 6. Evidence in this folder

- `screenshots/01-editor-widgets.png` — editor (UI tab, all widgets; hidden result widgets are shown in the editor
  by design), `02-query.png` — `GetExpenses` config, `03-jsobject.png` — the `Budget` JS Object,
  `04-deployed.png` — deployed app with TC02.
- `task-04/screenshots/lowcode/tc01.png … tc11.png` — one screenshot per test case.
- `budget-check-appsmith.json` — exported application; `gen_appsmith_app.py` — the generator used to assemble it;
  `Budget.jsobject.js` — the JS Object source.

## 7. Platform restrictions and workarounds (observed)

| # | Restriction | Workaround | Observed |
|---|---|---|---|
| L1 | Appsmith Cloud cannot reach `localhost` | Self-hosted CE in Docker, backend via `host.docker.internal:8000` | Confirmed: 12 requests from the container in the backend log (`screenshots/backend-log-appsmith.png`) |
| L2 | The Number input uses a dot as the decimal separator; the React app uses the Russian comma | Typed `79.99` / `1000000.01` in Appsmith | Used the dot; comma input in Appsmith was not tested |
| L3 | No month-only picker | Text input + regex validation in the JS Object | As planned |
| L4 | JS `Math.round` (half up) vs Python `round()` (half to even) for exact `.x5` values | None needed for the 11 cases | Not hit; portability risk remains |
| L5 | The app lives in Appsmith's own database; versioning needs Git sync or manual export | Exported JSON saved in the repository | Confirmed: no file-level diff of a change is possible without export |
| L6 | An imported page DSL with an old version number is migrated on load; the blank export had `version: 4`, so the 16→64 grid migration scaled every widget ×4 | Set the page DSL `version` to the current `LATEST_DSL_VERSION` (95, found in the shipped source maps) and re-import | Hit once (first import), fixed on the second import |
| L7 | Image size and start-up: ~2 GB image, 55 s until `/api/v1/health` reports "All systems are up"; Docker VM had 4 GB RAM | — | Confirmed |
| L8 | No automated tests for JS Objects in this setup; every regression check means re-running the UI cases | The 11 cases were re-run by a headless-browser script | Confirmed |

**Mocked or simulated parts: none.** The Appsmith app reads real expenses from the running backend; all 11 cases
were executed in the deployed app.

## 8. Cloud variant (Appsmith Cloud, no backend)

Appsmith Cloud (app.appsmith.com) cannot reach the backend on the developer's machine, so a second variant was
prepared for the cloud: `budget-check-cloud-import.json`, JS Object `Budget.cloud.jsobject.js`.

| Part | Local (Docker) variant | Cloud variant |
|---|---|---|
| Data | live: REST query `GetExpenses` → `GET /api/expenses?category=…` on the real backend | **SIMULATED DATA SOURCE**: a static copy of the 6 fictional fixture expenses inside the JS Object (`EXPENSES`), filtered by category exactly like the API |
| Validation, core logic, output | `validate()`, `calculate()`, widgets | identical (same code, same widgets) |
| Label in the UI | — | subtitle «демо-данные: встроенная копия тестового набора, без бэкенда» |
| TC11 (server down) | Pass (real backend stopped) | **not applicable** — there is no server; not counted as a pass |

The cloud variant was first checked on the local Appsmith with the backend **stopped**: TC01–TC10 gave the same
values as in the test table (`screenshots/cloud-variant-local-check-1.png`, `screenshots/cloud-variant-local-check-2.png`, `screenshots/05-cloud-variant-local-check.png`).
The official low-code results in `task-04/test-suite.md` come from the local variant with live data.

Import into Appsmith Cloud: *Create new → Import → Import from file* → `budget-check-cloud-import.json` →
*Deploy*. Keep the app private unless it must be shown publicly; it contains only fictional data.

**Deployed on Appsmith Cloud (2026-11-27):** https://app.appsmith.com/app/budget-check-cloud/page1-6b0976f037b7b2548fa00804
(workspace of the student; visibility: private — sign-in required). The import showed one toast «Missing plugin id.
Please enter one.»; the JS Object `Budget` was nevertheless imported complete (5 functions, 6 variables, checked via
the Appsmith API) and the deployed app works. Check in the cloud: TC02 (2025-03 · Еда · 100) → «Еда, 2025-03»,
«Близко к лимиту», «Использовано: 80,0 %», «Потрачено: 80,00», «Осталось: 20,00» (`screenshots/06-cloud-deployed-tc02.jpg`).
