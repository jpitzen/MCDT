"""
Database configuration and session management.
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import get_settings

settings = get_settings()

# Async engine for FastAPI
async_engine = create_async_engine(
    settings.database_url.replace("postgresql://", "postgresql+asyncpg://"),
    echo=settings.debug,
    pool_size=settings.db_pool_size,
    max_overflow=settings.db_max_overflow,
    pool_timeout=settings.db_pool_timeout,
    pool_recycle=settings.db_pool_recycle,
)

# Sync engine for migrations
sync_engine = create_engine(
    settings.database_url,
    echo=settings.debug,
    pool_size=settings.db_pool_size,
    max_overflow=settings.db_max_overflow,
)

AsyncSessionLocal = sessionmaker(
    async_engine,
    class_=AsyncSession,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False
)

Base = declarative_base()


async def get_db():
    """Dependency for getting database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
