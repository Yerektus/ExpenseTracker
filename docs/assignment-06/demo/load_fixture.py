"""Загружает вымышленный набор расходов из task-01/requirements.md §4 через API.

Ничего не удаляет: только POST /api/expenses. Запускать на временной базе, например:
    DATABASE_URL=sqlite:////tmp/budget-demo.db uvicorn app.main:app      (из backend/)
    python docs/assignment-06/demo/load_fixture.py http://localhost:8000
"""

import json
import sys
import urllib.request

FIXTURE = [
    {"amount": 20.0, "category": "food", "description": "Продукты (конец февраля)", "date": "2025-02-28"},
    {"amount": 30.0, "category": "food", "description": "Завтрак в кафе", "date": "2025-03-01"},
    {"amount": 45.5, "category": "food", "description": "Продукты на неделю", "date": "2025-03-15"},
    {"amount": 4.5, "category": "food", "description": "Кофе", "date": "2025-03-31"},
    {"amount": 15.0, "category": "food", "description": "Обед (начало апреля)", "date": "2025-04-01"},
    {"amount": 18.4, "category": "transport", "description": "Такси до вокзала", "date": "2025-03-10"},
]


def main() -> None:
    api = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8000"
    for expense in FIXTURE:
        request = urllib.request.Request(
            f"{api}/api/expenses",
            data=json.dumps(expense).encode(),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(request) as response:
            print(response.status, json.loads(response.read()))


if __name__ == "__main__":
    main()
