import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.main import app


@pytest.fixture()
def client(tmp_path):
    """TestClient, работающий с отдельной временной SQLite-базой (новой для каждого теста)."""
    test_engine = create_engine(
        f"sqlite:///{tmp_path / 'test.db'}",
        connect_args={"check_same_thread": False},
    )
    TestingSessionLocal = sessionmaker(bind=test_engine, autoflush=False, autocommit=False)
    Base.metadata.create_all(bind=test_engine)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    # TestClient создаётся без `with`, чтобы не запускать lifespan
    # и не трогать основную базу expenses.db.
    yield TestClient(app)
    app.dependency_overrides.clear()
    test_engine.dispose()


@pytest.fixture()
def create_expense(client):
    """Фабрика: создаёт расход через API и возвращает JSON ответа."""

    def _create(**overrides):
        payload = {
            "amount": 10.0,
            "category": "food",
            "description": "Тестовый расход",
            "date": "2025-01-15",
        }
        payload.update(overrides)
        response = client.post("/api/expenses", json=payload)
        assert response.status_code == 201, response.text
        return response.json()

    return _create
