from sqlmodel import SQLModel, create_engine, Session
from typing import Annotated
from fastapi import Depends
import os

# Настройка базы данных
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./interviews.db")

# Создание движка базы данных
engine = create_engine(
    DATABASE_URL,
    echo=True,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)


def create_db_and_tables():
    """Создание всех таблиц в базе данных"""
    SQLModel.metadata.create_all(engine)


def get_session():
    """Получение сессии базы данных"""
    with Session(engine) as session:
        yield session


# Тип зависимости для сессии
SessionDep = Annotated[Session, Depends(get_session)]
