import shutil

from fastapi import FastAPI, HTTPException, Depends, Header, Form, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import joinedload, selectinload

from datetime import datetime, timezone
from contextlib import asynccontextmanager
from pydantic import BaseModel
import uuid
import os

# Import modules
from Back.models import User, Shot, Comment, Like
from Back.handle import check_daily_limit
from Back.database import create_db_and_tables, get_async_session
from Back.storage import save_file

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

os.makedirs("Back/uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="Back/uploads"), name="uploads")

""" HELPER FUNCTION TO GET THE CURRENT USER"""
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

class CommentCreate(BaseModel):
  content: str

""" CREATE POST (SHOT) """
@app.post("/post")
async def create_post(
  caption: str = Form(...),
  image: UploadFile | None = File(default=None),
  user: User = Depends(get_current_user),
  db: AsyncSession = Depends(get_async_session)
):

  """
  1- Get caption, image and current user (in the arguments)
  2- Check if the user already posted for the day
  3- Process image if it exists
  4- Create the shot
  5- Update user's last_post
  6- Save to database
  7- Return shot's JSON
  """

  # 2- Check Limits
  can_post = check_daily_limit(user.last_post_at)
  if not can_post:
    raise HTTPException(status_code=429, detail="You have already made your post for the day.")

  # 3- Process image (if it exists)

  image_path = None
  if image:

    # ============== Security check ============
    ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"]

    if image.content_type not in ALLOWED_TYPES:
      raise HTTPException(
        status_code=400,
        detail="Invalid file type. Only JPEG, PNG, and WEBP images are allowed."
      )

    # ============== Saving image ==============
    # File name will be: user_timestamp to prevent overwrite
    file_extension = image.filename.split(".")[-1]
    unique_name = f"{user.id}+{datetime.now().timestamp()}.{file_extension}"

    image_url = save_file(image, unique_name) # Decide weather to save into Cloud or local


  # 4- Create the shot
  new_shot = Shot(
    caption=caption,
    user_id=user.id,
    image_url = image_url
  )
  db.add(new_shot)

  # 5- Update user's last_post
  user.last_post_at = datetime.now(timezone.utc)

  # 6- Save to db
  await db.commit()
  await db.refresh(new_shot)

  # 6- Return shot's JSON
  return {
    "status": "Post successful!",
    "shot_id": str(new_shot.id),
    "content": new_shot.caption,
    "image_url": new_shot.image_url,
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
        .options(
    joinedload(Shot.owner), # Load Shot owner
            joinedload(Shot.likes), # Load Likes
            selectinload(Shot.comments).joinedload(Comment.owner)) # Load Comments AND the User who wrote each comment
        .order_by(Shot.created_at.desc())
        .limit(10)
    )

  result = await session.execute(query)
  shots_list = result.scalars().unique().all()

  #Load shots data as a JSON in an array
  shots_data = []

  for shot in shots_list:
    shots_data.append({
      "id": str(shot.id),
      "caption": shot.caption,
      "created_at": shot.created_at.isoformat(),

      "owner": shot.owner.username,
      "owner_id": str(shot.owner.id), # For frontend part to check if the user owns the shot

      "like_count": len(shot.likes),

      # Array of comments
      "comments": [
        {
          "id": str(c.id),
          "owner": c.owner.username, # Uses the new relationship
          "content": c.content
        }
        for c in shot.comments
      ],

      "image_url": shot.image_url
    })

  return shots_data


@app.post("/shot/{shot_id}/like")
async def like_shot(
  shot_id: str,
  user: User = Depends(get_current_user),
  db: AsyncSession = Depends(get_async_session)
):

  """
  1- Check limits (if user already liked today)
  2- Check if Shot exists
  3- Update "Like" db
  4- Update last_like_at for the user
  5- Return status and number of likes left for the user
  """

  can_like = check_daily_limit(user.last_like_at)
  if not can_like:
    raise HTTPException(status_code=429, detail="You already used your One Like for today.")

  try:
    shot_uuid = uuid.UUID(shot_id) # convert from str to uuid
  except ValueError:
    raise HTTPException(status_code=400, detail="Invalid Shot ID format")

  result = await db.execute(select(Shot).where(Shot.id == shot_uuid))
  target_shot = result.scalars().first()

  if not target_shot:
    raise HTTPException(status_code=404, detail="This Shot doesn't even exist...")


  new_like = Like(user_id= user.id, shot_id = target_shot.id)
  db.add(new_like)

  user.last_like_at = datetime.now(timezone.utc)

  await db.commit()

  return {"status": f"Liked! the post with the id {target_shot.id}",
          "remaining likes for the user": 0}


@app.post("/shot/{shot_id}/comment")
async def post_comment(
  shot_id: str,
  comment: CommentCreate,
  user: User = Depends(get_current_user),
  db: AsyncSession = Depends(get_async_session)
):

  """
  1- Check limits
  2- Check if shot exists
  3- Update "Comment" db
  4- Update last_comment_at for the user
  5- Return status and content of the comment and the shot that was commented on
  """

  can_comment = check_daily_limit(user.last_comment_at)
  if not can_comment:
    raise HTTPException(status_code=429, detail="You already used your One Comment for today.")

  try:
    shot_uuid = uuid.UUID(shot_id) # convert from str to uuid
  except ValueError:
    raise HTTPException(status_code=400, detail="Invalid Shot ID")

  result = await db.execute(select(Shot).where(Shot.id == shot_uuid))
  target_shot = result.scalars().first()

  if not target_shot:
    raise HTTPException(status_code=404, detail="Shot not found")

  new_comment = Comment(
    content=comment.content,
    user_id=user.id,
    shot_id=target_shot.id
  )
  db.add(new_comment)

  user.last_comment_at = datetime.now(timezone.utc)

  await db.commit()

  return {"status": "Commented!",
          "content": comment.content,
          "shot_id with the comment": shot_uuid}
