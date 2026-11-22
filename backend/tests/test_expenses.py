import datetime as dt
from types import SimpleNamespace

from app.crud import calculate_summary


def test_create_expense(client):
    payload = {
        "amount": 12.5,
        "category": "transport",
        "description": "Автобус",
        "date": "2025-02-01",
    }

    response = client.post("/api/expenses", json=payload)

    assert response.status_code == 201
    data = response.json()
    assert isinstance(data["id"], int)
    assert {key: data[key] for key in payload} == payload


def test_create_expense_with_invalid_data_returns_422(client):
    response = client.post(
        "/api/expenses",
        json={"amount": -5, "category": "travel", "description": "", "date": "2025-02-01"},
    )

    assert response.status_code == 422


def test_list_expenses_with_category_filter(client, create_expense):
    create_expense(category="food", description="Обед")
    create_expense(category="transport", description="Метро")
    create_expense(category="food", description="Ужин")

    all_expenses = client.get("/api/expenses").json()
    food_expenses = client.get("/api/expenses", params={"category": "food"}).json()

    assert len(all_expenses) == 3
    assert len(food_expenses) == 2
    assert {expense["category"] for expense in food_expenses} == {"food"}


def test_update_expense(client, create_expense):
    expense = create_expense()
    updated_payload = {
        "amount": 99.99,
        "category": "entertainment",
        "description": "Концерт",
        "date": "2025-03-10",
    }

    response = client.put(f"/api/expenses/{expense['id']}", json=updated_payload)

    assert response.status_code == 200
    assert response.json() == {"id": expense["id"], **updated_payload}


def test_delete_expense(client, create_expense):
    expense = create_expense()

    response = client.delete(f"/api/expenses/{expense['id']}")

    assert response.status_code == 204
    assert client.get("/api/expenses").json() == []


def test_nonexistent_expense_returns_404(client):
    payload = {"amount": 1, "category": "other", "description": "", "date": "2025-01-01"}

    assert client.put("/api/expenses/999", json=payload).status_code == 404
    assert client.delete("/api/expenses/999").status_code == 404


def test_summary_endpoint(client, create_expense):
    create_expense(amount=10.5, category="food")
    create_expense(amount=4.5, category="food")
    create_expense(amount=20, category="utilities")

    response = client.get("/api/summary")

    assert response.status_code == 200
    assert response.json() == {
        "by_category": {
            "food": 15.0,
            "transport": 0.0,
            "entertainment": 0.0,
            "utilities": 20.0,
            "other": 0.0,
        },
        "total": 35.0,
    }


def test_calculate_summary_rounds_totals():
    expenses = [
        SimpleNamespace(amount=0.1, category="food", date=dt.date(2025, 1, 1)),
        SimpleNamespace(amount=0.2, category="food", date=dt.date(2025, 1, 2)),
        SimpleNamespace(amount=1.0, category="other", date=dt.date(2025, 1, 3)),
    ]

    summary = calculate_summary(expenses)

    assert summary["by_category"]["food"] == 0.3
    assert summary["by_category"]["transport"] == 0.0
    assert summary["total"] == 1.3
