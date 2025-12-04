from fastapi import FastAPI, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone
from contextlib import asynccontextmanager

# Import modules
from Back.models import User
from Back.handle import check_daily_limit
from Back.database import create_db_and_tables, get_async_session

@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_db_and_tables()
    yield

app = FastAPI(lifespan=lifespan)

@app.post("/post")
async def create_post(content: str, db: AsyncSession = Depends(get_async_session)):

  """
  1- Get the current user
  2- Check if the user already posted for the day
  3- Update the database with the user's last_post
  4- Return post's details
  """

  result = await db.execute(select(User).where(User.username == "clock"))
  user = result.scalars().first()

  # create a user just for testing
  if not user:
    user = User(username="clock")
    db.add(user)
    await db.commit()
    await db.refresh(user)

  can_post = check_daily_limit(user.last_post_at)
  if not can_post:
    raise HTTPException(status_code=405, detail="You have already made your post for the day.")


  user.last_post_at = datetime.now(timezone.utc)
  await db.commit()

  return {"Status:": "Post successful!", "content": content}


"""Home page for all the shots for everyone"""
# @app.get("/shots")
# async def shots(session: AsyncSession = Depends(get_async_session)):
"""
1-Get some of the shots in the database
    this includes the comments, likes, caption, user who posted it, user's logo (to display beside user's name)
2-return the shots informations so it can be used to render the home page on the frontend side
"""
