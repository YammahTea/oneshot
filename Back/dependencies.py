from fastapi import HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

import jwt

# Modules
from Back.services.auth import is_token_blacklisted, SECRET_KEY, ALGORITHM
from Back.services.redis_client import get_redis
from Back.core.models import User
from Back.core.database import get_db


""" HELPER FUNCTION TO GET THE CURRENT USER"""
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

async def get_current_user(
        token: str = Depends(oauth2_scheme),
        db: AsyncSession = Depends(get_db),
        redis = Depends(get_redis)
):
  
  credentials_exception = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
  )
  
  # 1- Check Blacklist
  # If the token is in the trash, reject it immediately.
  if await is_token_blacklisted(token, redis):
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token is invalid (Logged out)")
  
  try:
    # 2- Decode the Token
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    username: str = payload.get("sub")
    
    if username is None:
      raise credentials_exception
  
  except jwt.PyJWTError:
    raise credentials_exception
  
  # 3- Find User in DB
  result = await db.execute(select(User).where(User.username == username))
  user = result.scalars().first()
  
  if user is None:
    raise credentials_exception
  
  return user