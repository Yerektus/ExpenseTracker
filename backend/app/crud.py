from collections.abc import Iterable

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Expense
from app.schemas import Category, ExpenseCreate, ExpenseUpdate


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
