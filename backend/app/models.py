import datetime as dt

from sqlalchemy import Date, Float, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Expense(Base):
    __tablename__ = "expenses"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    category: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    description: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    date: Mapped[dt.date] = mapped_column(Date, nullable=False)
