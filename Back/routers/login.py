from fastapi import status, HTTPException, Depends, APIRouter
from fastapi.security import OAuth2PasswordRequestForm

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from pydantic import BaseModel
import jwt

# Modules
from Back.core.models import User
from Back.core.database import get_db
from Back.services.redis_client import get_redis
from Back.services.auth import hash_password, create_access_token, verify_password, ALGORITHM, SECRET_KEY, add_token_to_blacklist
from Back.dependencies import oauth2_scheme

""" Router for register and login in the auth screen + logout in profile page """
router =  APIRouter(
  tags=["Authentication"]
)


""" BaseModels to validate user input type """
class UserRegister(BaseModel):
  username: str
  password: str

class UserLogin(BaseModel):
  username: str
  password: str


""" Endpoint to handle registering """
@router.post("/auth/register")
async def register(
        user_data: UserRegister,
        db: AsyncSession = Depends(get_db)
):
  """
  1- Check if username exists
  2- Hash password
  3- Create user
  4- Generate JWT
  """
  
  # 1- Check if username exists
  result = await db.execute(select(User).where(User.username == user_data.username))
  existing_user = result.scalars().first()
  
  if existing_user:
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already taken.")
  
  # 2- Hash password
  hashed_pwd = hash_password(user_data.password)
  
  # 3- Create the user
  new_user = User(
    username = user_data.username,
    hashed_password = hashed_pwd
  )
  
  db.add(new_user)
  await db.commit()
  await db.refresh(new_user)
  
  
  # 4- Generate the JWT
  access_token = create_access_token(data={"sub": new_user.username})
  
  return {"access_token": access_token, "token_type": "bearer", "username": new_user.username}


""" Endpoint to handle logging in and validation """
@router.post("/auth/login")
async def login(
        form_data: OAuth2PasswordRequestForm = Depends(),
        db: AsyncSession = Depends(get_db)
):
  
  """
  1- Find the user
  2- Check if User exists AND Password match
  3- Create (JWT)
  """
  
  # 1- Find the user
  result = await db.execute(select(User).where(User.username == form_data.username))
  user = result.scalars().first()
  
  # 2- Check credentials
  if not user or not verify_password(form_data.password, user.hashed_password):
    raise HTTPException(
      status_code=status.HTTP_401_UNAUTHORIZED,
      detail=["Incorrect username or password"],
      headers={"WWW-Authenticate": "Bearer"}
    )
  
  # 3- Create JWT
  access_token = create_access_token(data={"sub": user.username})
  
  return {"access_token": access_token, "token_type": "bearer", "username": user.username}


""" Endpoint to logout the user """
@router.post("auth/logout")
async def logout(
        token: str = Depends(oauth2_scheme),
        redis = Depends(get_redis)
):
  """
  Receives the token from the frontend and adds it to the Redis Blacklist.
  """
  
  try:
    # 1- Decode just to find out when this token was supposed to expire
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    expiration = payload.get("exp")
    
    # 2- Blacklist the token
    await add_token_to_blacklist(token, expiration, redis)
  
  except jwt.PyJWTError:
    pass
  
  return {"message": "Successfully logged out"}