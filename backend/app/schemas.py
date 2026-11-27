import datetime as dt
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field, field_validator


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


class BudgetStatus(StrEnum):
    OK = "ok"
    WARNING = "warning"
    OVER = "over"


class BudgetCheckQuery(BaseModel):
    """Параметры проверки бюджета (query-строка GET /api/budget-check)."""

    model_config = ConfigDict(extra="forbid")

    month: str = Field(
        pattern=r"^[1-9]\d{3}-(0[1-9]|1[0-2])$",
        description="Месяц в формате ГГГГ-ММ",
    )
    category: Category
    # Не меньше одной копейки: иначе статус и процент считаются от лимита, округлённого до нуля.
    limit: float = Field(ge=0.01, le=1_000_000, description="Лимит бюджета на месяц")

    @field_validator("limit")
    @classmethod
    def limit_has_at_most_two_decimals(cls, value: float) -> float:
        if round(value, 2) != value:
            raise ValueError("Лимит должен быть указан с точностью до копеек")
        return value


class BudgetCheck(BaseModel):
    month: str
    category: Category
    limit: float
    spent: float
    remaining: float
    percent_used: float
    status: BudgetStatus
