from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import joinedload
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from pydantic import BaseModel

# Import modules
from Back.models import User, Shot, Comment
from Back.handle import check_daily_limit
from Back.database import create_db_and_tables, get_async_session

@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_db_and_tables()
    yield

app = FastAPI(lifespan=lifespan)

app.add_middleware(
  CORSMiddleware,
  allow_origins=["http://localhost:5173"],
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)


async def get_current_user(
  x_username: str = Header(...),
  db: AsyncSession = Depends(get_async_session)
):
  result = await db.execute(select(User).where(User.username == x_username))
  user = result.scalars().first()

  if not user:
    user = User(username=x_username)
  db.add(user)
  await db.commit()
  await db.refresh(user)

  return user

class ShotCreate(BaseModel):
  content: str

@app.post("/post")
async def create_post(shot: ShotCreate,
                      user: User = Depends(get_current_user),
                      db: AsyncSession = Depends(get_async_session)):

  """
  1- Get the current user (in the arguments)
  2- Check if the user already posted for the day
  3- Create the shot
  4- Update user's last_post
  5- Save to database
  6- Return shot's JSON
  """

  # 2- Check Limits
  can_post = check_daily_limit(user.last_post_at)
  if not can_post:
    raise HTTPException(status_code=429, detail="You have already made your post for the day.")

  # 3- Create the shot
  new_shot = Shot(
    caption=shot.content,
    user_id=user.id
  )
  db.add(new_shot)

  # 4- Update user's last_post
  user.last_post_at = datetime.now(timezone.utc)

  # 5- Save to db
  await db.commit()
  await db.refresh(new_shot)

  # 6- Return shot's JSON
  return {
    "status": "Post successful!",
    "shot_id": str(new_shot.id),
    "content": new_shot.caption,
    "owner": user.username
  }


"""Home page for all the shots for everyone"""
@app.get("/shots")
async def shots(session: AsyncSession = Depends(get_async_session)):

  """
  1-Grab 10 shots from the database by the created_at
  2-link Shot with User db to avoid N+1 problem
  3-Load shots data in as a JSON in an array
  """

  # 1-Grab 10 shots
  # 2-Join User db to the shots
  query = (
        select(Shot)
        .options(joinedload(Shot.owner)) # N+1 problem
        .order_by(Shot.created_at.desc())
        .limit(10)
    )

  result = await session.execute(query)
  shots_list = result.scalars().all()

  #Load shots data as a JSON in an array
  shots_data = []

  for shot in shots_list:
    shots_data.append({
      "id": str(shot.id),
      "caption": shot.caption,
      "created_at": shot.created_at.isoformat(),

      "owner": shot.owner.username,
      "owner_id": str(shot.owner.id) # For frontend part to check if the user owns the shot
    })

  return shots_data


