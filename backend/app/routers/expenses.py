from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import crud
from app.database import get_db
from app.models import Expense
from app.schemas import Category, ExpenseCreate, ExpenseRead, ExpenseUpdate, Summary

router = APIRouter(prefix="/api", tags=["expenses"])

DbSession = Annotated[Session, Depends(get_db)]


def get_expense_or_404(db: Session, expense_id: int) -> Expense:
    expense = crud.get_expense(db, expense_id)
    if expense is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Expense {expense_id} not found",
        )
    return expense


@router.get("/expenses", response_model=list[ExpenseRead])
def read_expenses(db: DbSession, category: Category | None = None):
    return crud.list_expenses(db, category)


@router.post("/expenses", response_model=ExpenseRead, status_code=status.HTTP_201_CREATED)
def create_expense(data: ExpenseCreate, db: DbSession):
    return crud.create_expense(db, data)


@router.put("/expenses/{expense_id}", response_model=ExpenseRead)
def update_expense(expense_id: int, data: ExpenseUpdate, db: DbSession):
    expense = get_expense_or_404(db, expense_id)
    return crud.update_expense(db, expense, data)


@router.delete("/expenses/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(expense_id: int, db: DbSession):
    expense = get_expense_or_404(db, expense_id)
    crud.delete_expense(db, expense)


@router.get("/summary", response_model=Summary)
def read_summary(db: DbSession):
    return crud.get_summary(db)
