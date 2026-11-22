"""Заполняет базу 10 вымышленными расходами.

Запуск (из папки backend):  python seed.py
Внимание: перед заполнением все существующие расходы удаляются.
"""

import datetime as dt

from sqlalchemy import delete

from app.database import Base, SessionLocal, engine
from app.models import Expense

SAMPLE_EXPENSES = [
    (12.50, "food", "Обед в столовой", dt.date(2025, 3, 1)),
    (3.20, "transport", "Проезд на автобусе", dt.date(2025, 3, 1)),
    (45.00, "utilities", "Оплата электроэнергии", dt.date(2025, 3, 2)),
    (8.75, "food", "Кофе и выпечка", dt.date(2025, 3, 3)),
    (15.00, "entertainment", "Билет в кино", dt.date(2025, 3, 4)),
    (60.30, "food", "Продукты на неделю", dt.date(2025, 3, 5)),
    (25.00, "utilities", "Домашний интернет", dt.date(2025, 3, 6)),
    (9.90, "entertainment", "Подписка на музыкальный сервис", dt.date(2025, 3, 7)),
    (18.40, "transport", "Такси до вокзала", dt.date(2025, 3, 8)),
    (7.00, "other", "Канцелярские товары", dt.date(2025, 3, 9)),
]


def seed() -> None:
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        db.execute(delete(Expense))
        db.add_all(
            Expense(amount=amount, category=category, description=description, date=date)
            for amount, category, description, date in SAMPLE_EXPENSES
        )
        db.commit()
    print(f"Добавлено расходов: {len(SAMPLE_EXPENSES)}")


if __name__ == "__main__":
    seed()
