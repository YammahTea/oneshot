from passlib.context import CryptContext
import jwt
from datetime import datetime, timedelta, timezone

import os
from dotenv import load_dotenv

load_dotenv()

# Hash config
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Secret config
SECRET_KEY = os.getenv("AUTH_SECRET_KEY")
ALGORITHM = os.getenv("AUTH_ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("AUTH_ACCESS_TOKEN_EXPIRE_MINUTES"))

def hash_password(password: str) -> str:
  return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
  return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict):
  to_encode = data.copy()

  # expire time
  expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
  to_encode.update({"exp": expire})

  encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
  return encoded_jwt


async def is_token_blacklisted(token: str, redis_client) -> bool:
  """Returns True if the token is found in the Redis blacklist."""
  return await redis_client.exists(f"blacklist:token:{token}")


async def add_token_to_blacklist(token: str, expiration_timestamp: float, redis_client):
  """
  Calculates remaining time and adds token to Redis blacklist.
  """

  current_time = datetime.now(timezone.utc).timestamp()
  time_left = int(expiration_timestamp - current_time)

  if time_left > 0:
    # Key: "blacklist:token:{token}"
    await redis_client.setex(
      name=f"blacklist:token:{token}",
      time=time_left,
      value="blacklisted"
    )
