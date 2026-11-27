import calendar
import datetime as dt
from collections.abc import Iterable

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Expense
from app.schemas import (
    BudgetCheckQuery,
    BudgetStatus,
    Category,
    ExpenseCreate,
    ExpenseUpdate,
)

# С какой доли лимита (в процентах) бюджет считается «близким к лимиту».
BUDGET_WARNING_PERCENT = 80


def list_expenses(db: Session, category: Category | None = None) -> list[Expense]:
    query = select(Expense).order_by(Expense.date.desc(), Expense.id.desc())
    if category is not None:
        query = query.where(Expense.category == category)
    return list(db.scalars(query))


def get_expense(db: Session, expense_id: int) -> Expense | None:
    return db.get(Expense, expense_id)


def create_expense(db: Session, data: ExpenseCreate) -> Expense:
    expense = Expense(**data.model_dump())
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense


def update_expense(db: Session, expense: Expense, data: ExpenseUpdate) -> Expense:
    for field, value in data.model_dump().items():
        setattr(expense, field, value)
    db.commit()
    db.refresh(expense)
    return expense


def delete_expense(db: Session, expense: Expense) -> None:
    db.delete(expense)
    db.commit()


def calculate_summary(expenses: Iterable[Expense]) -> dict:
    """Считает сумму расходов по каждой категории и общий итог.

    Чистая функция без обращения к БД — её легко тестировать отдельно.
    Категории без расходов присутствуют в результате с нулевой суммой.
    """
    by_category = {category: 0.0 for category in Category}
    for expense in expenses:
        by_category[Category(expense.category)] += expense.amount

    by_category = {category: round(amount, 2) for category, amount in by_category.items()}
    total = round(sum(by_category.values()), 2)
    return {"by_category": by_category, "total": total}


def get_summary(db: Session) -> dict:
    return calculate_summary(list_expenses(db))


def month_bounds(month: str) -> tuple[dt.date, dt.date]:
    """"2025-02" -> (2025-02-01, 2025-02-28): первый и последний день месяца включительно."""
    year, month_number = (int(part) for part in month.split("-"))
    last_day = calendar.monthrange(year, month_number)[1]
    return dt.date(year, month_number, 1), dt.date(year, month_number, last_day)


def list_expenses_in_month(db: Session, category: Category, month: str) -> list[Expense]:
    first_day, last_day = month_bounds(month)
    query = select(Expense).where(
        Expense.category == category,
        Expense.date >= first_day,
        Expense.date <= last_day,
    )
    return list(db.scalars(query))


def calculate_budget_check(amounts: Iterable[float], limit: float) -> dict:
    """Сравнивает сумму расходов с лимитом бюджета.

    Чистая функция без обращения к БД. Пороги статуса сравниваются в целых копейках,
    чтобы погрешность float не сдвигала граничные случаи (ровно 80 % и ровно 100 %).
    """
    spent = round(sum(amounts), 2)
    spent_cents = round(spent * 100)
    limit_cents = round(limit * 100)

    if spent_cents > limit_cents:
        status = BudgetStatus.OVER
    elif spent_cents * 100 >= limit_cents * BUDGET_WARNING_PERCENT:
        status = BudgetStatus.WARNING
    else:
        status = BudgetStatus.OK

    return {
        "spent": spent,
        "remaining": round(limit - spent, 2),
        "percent_used": round(spent / limit * 100, 1),
        "status": status,
    }


def get_budget_check(db: Session, params: BudgetCheckQuery) -> dict:
    expenses = list_expenses_in_month(db, params.category, params.month)
    result = calculate_budget_check((expense.amount for expense in expenses), params.limit)
    return {"month": params.month, "category": params.category, "limit": params.limit, **result}
