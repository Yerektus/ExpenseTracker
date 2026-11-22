from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import CORS_ORIGINS
from app.database import Base, engine
from app.routers import expenses


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Для учебного проекта таблицы создаются при старте, без миграций.
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="Expense Tracker API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(expenses.router)


@app.get("/api/health", tags=["health"])
def health_check():
    return {"status": "ok"}
