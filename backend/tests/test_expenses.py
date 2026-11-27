import datetime as dt
from types import SimpleNamespace

import pytest

from app.crud import calculate_budget_check, calculate_summary, month_bounds


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


# Набор из task-01/requirements.md §4: в марте 2025 на еду потрачено 30 + 45.5 + 4.5 = 80.
BUDGET_FIXTURE = [
    {"amount": 20.0, "category": "food", "date": "2025-02-28"},
    {"amount": 30.0, "category": "food", "date": "2025-03-01"},
    {"amount": 45.5, "category": "food", "date": "2025-03-15"},
    {"amount": 4.5, "category": "food", "date": "2025-03-31"},
    {"amount": 15.0, "category": "food", "date": "2025-04-01"},
    {"amount": 18.4, "category": "transport", "date": "2025-03-10"},
]


@pytest.fixture()
def budget_fixture(create_expense):
    for expense in BUDGET_FIXTURE:
        create_expense(**expense)


def test_budget_check_counts_only_category_and_month(client, budget_fixture):
    response = client.get(
        "/api/budget-check", params={"month": "2025-03", "category": "food", "limit": 200}
    )

    assert response.status_code == 200
    assert response.json() == {
        "month": "2025-03",
        "category": "food",
        "limit": 200.0,
        "spent": 80.0,
        "remaining": 120.0,
        "percent_used": 40.0,
        "status": "ok",
    }


@pytest.mark.parametrize(
    ("month", "limit", "expected"),
    [
        ("2025-03", 100, {"spent": 80.0, "remaining": 20.0, "percent_used": 80.0, "status": "warning"}),
        ("2025-03", 80, {"spent": 80.0, "remaining": 0.0, "percent_used": 100.0, "status": "warning"}),
        ("2025-03", 79.99, {"spent": 80.0, "remaining": -0.01, "percent_used": 100.0, "status": "over"}),
        ("2025-02", 50, {"spent": 20.0, "remaining": 30.0, "percent_used": 40.0, "status": "ok"}),
        ("2025-05", 100, {"spent": 0.0, "remaining": 100.0, "percent_used": 0.0, "status": "ok"}),
        ("2025-03", 1_000_000, {"spent": 80.0, "remaining": 999920.0, "percent_used": 0.0, "status": "ok"}),
        ("2025-05", 0.01, {"spent": 0.0, "remaining": 0.01, "percent_used": 0.0, "status": "ok"}),
    ],
)
def test_budget_check_boundaries(client, budget_fixture, month, limit, expected):
    response = client.get(
        "/api/budget-check", params={"month": month, "category": "food", "limit": limit}
    )

    assert response.status_code == 200
    assert {key: response.json()[key] for key in expected} == expected


@pytest.mark.parametrize(
    "params",
    [
        {"month": "2025-13", "category": "food", "limit": 100},
        {"month": "03.2025", "category": "food", "limit": 100},
        {"month": "0000-01", "category": "food", "limit": 100},
        {"month": "2025-03", "category": "travel", "limit": 100},
        {"month": "2025-03", "category": "food", "limit": 0},
        {"month": "2025-03", "category": "food", "limit": -5},
        {"month": "2025-03", "category": "food", "limit": 1_000_000.01},
        # Лимит меньше копейки или с долями копейки (найдено при агентном ревью, task-05 F1/F2).
        {"month": "2025-05", "category": "food", "limit": 0.004},
        {"month": "2025-03", "category": "food", "limit": 79.996},
        {"month": "2025-03", "category": "food", "limit": 1e-310},
        {"month": "2025-03", "category": "food"},
    ],
)
def test_budget_check_rejects_invalid_input(client, params):
    response = client.get("/api/budget-check", params=params)

    assert response.status_code == 422


def test_budget_check_is_read_only_and_repeatable(client, budget_fixture):
    params = {"month": "2025-03", "category": "food", "limit": 100}

    results = [client.get("/api/budget-check", params=params).json() for _ in range(3)]

    assert results[0]["status"] == "warning"
    assert results == [results[0]] * 3
    assert len(client.get("/api/expenses").json()) == len(BUDGET_FIXTURE)


def test_month_bounds_handles_month_lengths():
    assert month_bounds("2024-02") == (dt.date(2024, 2, 1), dt.date(2024, 2, 29))
    assert month_bounds("2025-02") == (dt.date(2025, 2, 1), dt.date(2025, 2, 28))
    assert month_bounds("2025-12") == (dt.date(2025, 12, 1), dt.date(2025, 12, 31))


def test_calculate_budget_check_thresholds_ignore_float_noise():
    # В float 0.1 + 0.2 == 0.30000000000000004: без сравнения в копейках лимит 0.3 считался бы превышенным.
    assert calculate_budget_check([0.1, 0.2], 0.3)["status"] == "warning"
    assert calculate_budget_check([0.1, 0.2], 0.29)["status"] == "over"
    assert calculate_budget_check([79.99], 100)["status"] == "ok"
    assert calculate_budget_check([], 100) == {
        "spent": 0.0,
        "remaining": 100.0,
        "percent_used": 0.0,
        "status": "ok",
    }
