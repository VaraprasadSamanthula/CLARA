"""Database setup, session management, and utilities."""

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool, QueuePool
from app.models import Base
from config import settings

# Configure engine based on database type
if settings.database_url.startswith("postgresql"):
    # PostgreSQL configuration with connection pooling for production
    engine = create_engine(
        settings.database_url,
        poolclass=QueuePool,
        pool_size=settings.get_database_engine_args().get("pool_size", 20),
        max_overflow=settings.get_database_engine_args().get("max_overflow", 10),
        pool_recycle=settings.get_database_engine_args().get("pool_recycle", 3600),
        echo=settings.get_database_engine_args().get("echo", False),
    )
elif settings.database_url.startswith("sqlite"):
    # SQLite configuration with WAL mode for better concurrency
    engine = create_engine(
        settings.database_url,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        echo=False,
    )
    
    # Enable WAL mode for better concurrency
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.close()
else:
    raise ValueError(f"Unsupported database URL: {settings.database_url}")

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
