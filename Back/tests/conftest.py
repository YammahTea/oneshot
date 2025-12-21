import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool
import fakeredis.aioredis

# import modules
from Back.app import app
from Back.core.database import get_db
from Back.core.models import Base
from Back.core.redis_client import get_redis
from Back.services.auth import create_access_token

# 1- in memory sqlite db
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

engine = create_async_engine(
  TEST_DATABASE_URL,
  connect_args = {"check_same_thread": False},
  poolclass = StaticPool
)

TestingSessionLocal = async_sessionmaker(
  autocommit=False,
  autoflush=False,
  expire_on_commit=False,
  bind=engine
)

# 2- in memory redis
fake_redis = fakeredis.aioredis.FakeRedis(decode_responses=True)


""" FIXTURE """

@pytest_asyncio.fixture
async def session():
  """Creates a fresh database for every test"""

  async with engine.begin() as conn:
    await conn.run_sync(Base.metadata.create_all)

  async with TestingSessionLocal() as session:
    yield session

  # cleanup
  async with engine.begin() as conn:
    await conn.run_sync(Base.metadata.drop_all)

@pytest_asyncio.fixture
async def client(session):
  """ The test client """

  # 1- override db
  def override_get_db():
    yield session

  # 2- override redis
  async def override_get_redis():
    yield fake_redis

  app.dependency_overrides[get_db] = override_get_db
  app.dependency_overrides[get_redis] = override_get_redis

  async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
    yield c

  app.dependency_overrides.clear()
  await fake_redis.flushall() # Clear redis after test

@pytest.fixture
def auth_headers():
  """Helper to create a valid token for tests"""

  token = create_access_token(data={"sub": "testuser"})
  return {"Authorization": f"Bearer {token}"}
