from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
import os
from dotenv import load_dotenv


load_dotenv()

DB_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./oneshot.db")

if DB_URL.startswith("postgres://"):
  DB_URL = DB_URL.replace("postgres://", "postgresql+asyncpg://", 1)

elif DB_URL.startswith("postgresql://") and "+asyncpg" not in DB_URL:
  DB_URL = DB_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

print(f"Connecting to Database: {DB_URL.split('@')[-1]}") # prints the host


engine = create_async_engine(DB_URL)
get_async_session = async_sessionmaker(engine, expire_on_commit=False)

class Base(DeclarativeBase):
  pass

async def create_db_and_tables():
  async with engine.begin() as conn:
    await conn.run_sync(Base.metadata.create_all)
