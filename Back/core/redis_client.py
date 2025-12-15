import redis.asyncio as redis
import os
from dotenv import load_dotenv

load_dotenv()

REDIS_URL = os.getenv("REDIS_URL")

redis_pool = redis.ConnectionPool.from_url(REDIS_URL)

async def get_redis():
  client = redis.Redis(connection_pool=redis_pool)
  try:
    yield client
  finally:
    await client.close()
