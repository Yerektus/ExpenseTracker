# Acceptance criteria

- AC1: `cd backend && pytest -q` — all tests pass (baseline: 8 passed).
- AC2: `cd frontend && npm test` — all tests pass (baseline: 2 passed).
- AC3: `cd frontend && npm run build` — build succeeds.
- AC4: POST /api/expenses with amount <= 0 returns 422 (verified with curl at baseline).
- AC5: GET /api/summary returns the correct total per category and the overall total.