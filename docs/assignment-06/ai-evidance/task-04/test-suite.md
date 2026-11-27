# Task 04 — Common test suite (budget check)

The cases were written on 2026-11-27 at about 16:40, **before** either implementation was built (the
feature code was started after this file was saved; see the timing log in `task-07`). Both implementations are tested with the same inputs, the same
fixture data (`task-01/requirements.md` §4, loaded by `demo/load_fixture.py`) and the same expected results.

Rules for recording results:
- *Observed* is what was actually seen on screen (or in the HTTP response), not what should happen.
- A case passes only if every expected value matches. A mocked or simulated response never counts as a pass.
- If a case could not be run, the cell says **Not run** and the reason.

Fixture: food 2025-02-28 20.00 · food 2025-03-01 30.00 · food 2025-03-15 45.50 · food 2025-03-31 4.50 ·
food 2025-04-01 15.00 · transport 2025-03-10 18.40 (6 expenses).

## Test cases

| ID | Type | AC | Input (month · category · limit) | Expected result |
|---|---|---|---|---|
| TC01 | Normal | AC1 | 2025-03 · Еда · 200 | Потрачено 80,00 · Осталось 120,00 · 40,0 % · «В пределах бюджета» |
| TC02 | Boundary (80 %) | AC2 | 2025-03 · Еда · 100 | 80,00 · 20,00 · 80,0 % · «Близко к лимиту» |
| TC03 | Boundary (100 %) | AC2 | 2025-03 · Еда · 80 | 80,00 · 0,00 · 100,0 % · «Близко к лимиту» |
| TC04 | Boundary (just over) | AC2 | 2025-03 · Еда · 79.99 | 80,00 · −0,01 · 100,0 % · «Бюджет превышен» |
| TC05 | Boundary (month edges) | AC1 | 2025-02 · Еда · 50 | 20,00 · 30,00 · 40,0 % · «В пределах бюджета» (only 28 Feb counted; 1 Mar excluded) |
| TC06 | Empty result | AC6 | 2025-05 · Еда · 100 | 0,00 · 100,00 · 0,0 % · «В пределах бюджета» |
| TC07 | Boundary (max limit) | AC3 | a) 2025-03 · Еда · 1000000 b) same with 1000000.01 | a) 80,00 · 999 920,00 · 0,0 % · «В пределах бюджета»; b) limit error message, no result |
| TC08 | Invalid input (limit) | AC3 | 2025-03 · Еда · a) 0 b) −5 c) empty | Error «Лимит должен быть больше 0 и не больше 1 000 000» at the limit field; no result; no request sent |
| TC09 | Invalid input (month) | AC3 | a) 2025-13 b) 03.2025 c) empty · Еда · 100 | Error «Укажите месяц в формате ГГГГ-ММ» at the month field; no result; no request sent |
| TC10 | Repeated operation | AC5 | TC02 three times in a row | Same result each time (80,00 · 20,00 · 80,0 % · «Близко к лимиту»); number of expenses stays 6 |
| TC11 | Error feedback | AC4 | Backend stopped, then TC01 | Error message that the server is unavailable; inputs keep 2025-03 · Еда · 200; no result card from an earlier check is shown |

API-only check for the code-based implementation (the low-code UI offers a fixed category list, so it
cannot send an unknown category): `GET /api/budget-check?month=2025-03&category=travel&limit=100` → 422.

## Results

| ID | Expected (short) | Code-based observed | Low-code (Appsmith) observed | Pass/Fail code | Pass/Fail low-code |
|---|---|---|---|---|---|
| TC01 | 80,00 · 120,00 · 40,0 % · ok | Потрачено 80,00 · Осталось 120,00 · 40,0 % · «В пределах бюджета» (`tc01.png`) | Потрачено: 80,00 · Осталось: 120,00 · Использовано: 40,0 % · «В пределах бюджета» (`lowcode/tc01.png`) | Pass | Pass |
| TC02 | 80,00 · 20,00 · 80,0 % · warning | 80,00 · 20,00 · 80,0 % · «Близко к лимиту» (`tc02.png`) | 80,00 · 20,00 · 80,0 % · «Близко к лимиту» (`lowcode/tc02.png`) | Pass | Pass |
| TC03 | 80,00 · 0,00 · 100,0 % · warning | 80,00 · 0,00 · 100,0 % · «Близко к лимиту» (`tc03.png`) | 80,00 · 0,00 · 100,0 % · «Близко к лимиту» (`lowcode/tc03.png`) | Pass | Pass |
| TC04 | 80,00 · −0,01 · 100,0 % · over | 80,00 · -0,01 · 100,0 % · «Бюджет превышен» (`tc04.png`) | 80,00 · -0,01 · 100,0 % · «Бюджет превышен» (`lowcode/tc04.png`) | Pass | Pass |
| TC05 | 20,00 · 30,00 · 40,0 % · ok | 20,00 · 30,00 · 40,0 % · «В пределах бюджета» (`tc05.png`) | 20,00 · 30,00 · 40,0 % · «В пределах бюджета» (`lowcode/tc05.png`) | Pass | Pass |
| TC06 | 0,00 · 100,00 · 0,0 % · ok | 0,00 · 100,00 · 0,0 % · «В пределах бюджета» (`tc06.png`) | 0,00 · 100,00 · 0,0 % · «В пределах бюджета» (`lowcode/tc06.png`) | Pass | Pass |
| TC07 | a) 999 920,00 · 0,0 % · ok b) error | a) 80,00 · 999 920,00 · 0,0 % · ok (`tc07a.png`); b) «Лимит должен быть больше 0 и не больше 1 000 000», no result, 0 requests (`tc07b.png`) | a) 80,00 · 999 920,00 · 0,0 % · ok (`lowcode/tc07a.png`); b) «Лимит должен быть больше 0 и не больше 1 000 000», no result, 0 query runs (`lowcode/tc07b.png`) | Pass | Pass |
| TC08 | error, no result, no request | a/b/c) limit error message, no result, 0 requests sent (`tc08a–c.png`) | a/b/c) limit error message, no result, 0 query runs (`lowcode/tc08a–c.png`) | Pass | Pass |
| TC09 | error, no result, no request | a/b/c) «Укажите месяц в формате ГГГГ-ММ», no result, 0 requests sent (`tc09a–c.png`) | a/b/c) «Укажите месяц в формате ГГГГ-ММ», no result, 0 query runs (`lowcode/tc09a–c.png`) | Pass | Pass |
| TC10 | same result ×3, still 6 expenses | 3 × 80,00 · 20,00 · 80,0 % · «Близко к лимиту»; `GET /api/expenses` → 6 (`tc10.png`) | 3 × 80,00 · 20,00 · 80,0 % · «Близко к лимиту»; `GET /api/expenses` → 6 (`lowcode/tc10.png`) | Pass | Pass |
| TC11 | error shown, inputs kept, no old result | Alert «Не удалось проверить бюджет — Не удалось подключиться к серверу. Запущен ли backend?»; inputs 2025-03 · Еда · 200 kept; result from step 1 removed (`tc11-before.png`, `tc11.png`) | «Не удалось проверить бюджет. Не удалось подключиться к серверу. Запущен ли backend?»; inputs 2025-03 · Еда · 200 kept; result from step 1 hidden (`lowcode/tc11-before.png`, `lowcode/tc11.png`) | Pass | Pass |

Code-based evidence: UI run in headless Chrome against the running app (`screenshots/ui-run-code-1.png`, `screenshots/ui-run-code-2.png`, screenshots in
`screenshots/code/`), API run with curl (`screenshots/api-run-1.png`, `screenshots/api-run-2.png`, including the API-only unknown-category case → 422),
automated tests `backend/tests/test_expenses.py` (budget tests) and `frontend/src/__tests__/BudgetCheck.test.jsx`.

Note on TC04: the app shows `-0,01` with an ASCII hyphen-minus (from `Intl.NumberFormat("ru-RU")`), the
expected value was written as `−0,01`. Same value, counted as Pass.

Low-code evidence: the deployed Appsmith app (View mode) driven in headless Chrome against the same backend
and fixture (`screenshots/ui-run-lowcode-1.png`, `screenshots/ui-run-lowcode-2.png`, screenshots in `screenshots/lowcode/`). In Appsmith the limit was typed with a
decimal dot (`79.99`, `1000000.01`) — the NumberInput widget's format (restriction L2); the value is the same.
"0 query runs" = no `/api/v1/actions/execute` request was sent by the page.

**Pass count — code-based: 11 / 11. Low-code (Appsmith): 11 / 11.** No case was simulated or skipped.
