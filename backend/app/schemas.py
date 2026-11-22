import datetime as dt
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field


class Category(StrEnum):
    FOOD = "food"
    TRANSPORT = "transport"
    ENTERTAINMENT = "entertainment"
    UTILITIES = "utilities"
    OTHER = "other"


class ExpenseBase(BaseModel):
    amount: float = Field(gt=0, description="Сумма расхода, больше нуля")
    category: Category
    description: str = Field(default="", max_length=255)
    date: dt.date


class ExpenseCreate(ExpenseBase):
    pass


class ExpenseUpdate(ExpenseBase):
    """PUT заменяет расход целиком, поэтому все поля те же, что и при создании."""


class ExpenseRead(ExpenseBase):
    model_config = ConfigDict(from_attributes=True)

    id: int


class Summary(BaseModel):
    by_category: dict[Category, float]
    total: float
