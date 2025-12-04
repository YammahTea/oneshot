from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from Back.models import Base
from typing import AsyncGenerator


DATABASE_URL = "sqlite+aiosqlite:///./oneshot.db"

engine = create_async_engine(DATABASE_URL, connect_args={"check_same_thread": False})

async_session_maker = async_sessionmaker(engine, expire_on_commit=False)

# Helper function to create tables
async def create_db_and_tables():
  async with engine.begin() as conn:
    await conn.run_sync(Base.metadata.create_all)

# Dependency: This gives a fresh DB session to every request
async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
  async with async_session_maker() as session:
    yield session
