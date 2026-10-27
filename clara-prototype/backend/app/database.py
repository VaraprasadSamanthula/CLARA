"""Database setup, session management, and utilities."""

import os
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
from app.models import Base

# Use SQLite local file; default path is ./clara.db relative to where we run uvicorn
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./clara.db")

# SQLite-specific optimizations for WAL mode (better concurrency)
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        echo=False,  # Set to True for SQL debugging
    )
    
    # Enable WAL mode for better concurrency
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.close()
else:
    engine = create_engine(DATABASE_URL)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Session:
    """Dependency injection for FastAPI: provides a DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all tables. Called during app startup."""
    Base.metadata.create_all(bind=engine)


def drop_all_tables():
    """Drop all tables. Useful for testing or reset."""
    Base.metadata.drop_all(bind=engine)
