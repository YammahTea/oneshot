from fastapi import FastAPI, HTTPException, Depends, Form, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import joinedload, selectinload

from datetime import datetime, timezone
from contextlib import asynccontextmanager
from pydantic import BaseModel
import uuid
import os
import jwt

# Import modules
from Back.core.models import User, Shot, Comment, Like
from Back.core.database import create_db_and_tables, get_db
from Back.core.storage import save_file
from Back.core.redis_client import get_redis
from Back.services.rate_limiter import check_user_cooldown
from Back.services.handle import check_daily_limit
from Back.services.auth import hash_password, verify_password, create_access_token, SECRET_KEY, ALGORITHM

@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_db_and_tables()
    yield

app = FastAPI(lifespan=lifespan)

origins = [
  "http://localhost:5173",                  # for local testing
  "https://oneshot-vhlh.onrender.com"       # frontend URL
]

app.add_middleware(
  CORSMiddleware,
  allow_origins=origins,
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)

os.makedirs("Back/uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="Back/uploads"), name="uploads")

""" HELPER FUNCTION TO GET THE CURRENT USER"""
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

async def get_current_user(
  token: str = Depends(oauth2_scheme),
  db: AsyncSession = Depends(get_db)
):

  credentials_exception = HTTPException(
    status_code=401,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
  )

  try:
    # 1- Decode the Token
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    username: str = payload.get("sub")

    if username is None:
      raise credentials_exception

  except jwt.PyJWTError:
    raise credentials_exception

  # 2- Find User in DB
  result = await db.execute(select(User).where(User.username == username))
  user = result.scalars().first()

  if user is None:
    raise credentials_exception

  return user

""" Base Models """
class CommentCreate(BaseModel):
  content: str

class UserRegister(BaseModel):
  username: str
  password: str

class UserLogin(BaseModel):
  username: str
  password: str


""" CREATE POST (SHOT) """
@app.post("/post")
async def create_post(
  caption: str = Form(...),
  image: UploadFile | None = File(default=None),
  user: User = Depends(get_current_user),
  db: AsyncSession = Depends(get_db),
  redis = Depends(get_redis)
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
  # 2.1- With redis
  await check_user_cooldown(user.id, redis)

  # 2.2- With database
  can_post = check_daily_limit(user.last_post_at)
  if not can_post:
    raise HTTPException(status_code=429, detail="You have already made your post for the day.")

  # 3- Process image (if it exists)

  image_url = None
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
  user.last_post_at = datetime.now(timezone.utc).replace(tzinfo=None)

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
async def shots(session: AsyncSession = Depends(get_db)):

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
  db: AsyncSession = Depends(get_db),
  redis = Depends(get_redis)
):

  """
  1- Check limits (if user already liked today)
  2- Check if Shot exists
  3- Update "Like" db
  4- Update last_like_at for the user
  5- Return status and number of likes left for the user
  """

  # 1- Check limits
  # 1.1- With redis
  await check_user_cooldown(user.id, redis)

  # 1.2- With database
  can_like = check_daily_limit(user.last_like_at)
  if not can_like:
    raise HTTPException(status_code=429, detail="You already used your One Like for today.")

  # 1.5- Check if the provided shot ID is valid
  try:
    shot_uuid = uuid.UUID(shot_id) # convert from str to uuid
  except ValueError:
    raise HTTPException(status_code=400, detail="Invalid Shot ID format")

  # 2- Check if shot exists
  result = await db.execute(select(Shot).where(Shot.id == shot_uuid))
  target_shot = result.scalars().first()

  if not target_shot:
    raise HTTPException(status_code=404, detail="This Shot doesn't even exist...")

  # 3- Create like + add like to db and updated last act
  new_like = Like(user_id= user.id, shot_id = target_shot.id)
  db.add(new_like)

  user.last_like_at = datetime.now(timezone.utc).replace(tzinfo=None)

  await db.commit()

  return {"status": f"Liked! the post with the id {target_shot.id}",
          "remaining likes for the user": 0}


@app.post("/shot/{shot_id}/comment")
async def post_comment(
  shot_id: str,
  comment: CommentCreate,
  user: User = Depends(get_current_user),
  db: AsyncSession = Depends(get_db),
  redis = Depends(get_redis)
):

  """
  1- Check limits
  2- Check if shot exists
  3- Update "Comment" db
  4- Update last_comment_at for the user
  5- Return status and content of the comment and the shot that was commented on
  """

  # 1- Check limits
  # 1.1- With redis
  await check_user_cooldown(user.id, redis)

  # 1.2- With database
  can_comment = check_daily_limit(user.last_comment_at)
  if not can_comment:
    raise HTTPException(status_code=429, detail="You already used your One Comment for today.")

  # 1.5- Check if the provided shot ID is valid
  try:
    shot_uuid = uuid.UUID(shot_id) # convert from str to uuid
  except ValueError:
    raise HTTPException(status_code=400, detail="Invalid Shot ID")

  # 2- Check if shot exists
  result = await db.execute(select(Shot).where(Shot.id == shot_uuid))
  target_shot = result.scalars().first()

  if not target_shot:
    raise HTTPException(status_code=404, detail="Shot not found")

  # 3- Create comment + add comment to db and updated last act
  new_comment = Comment(
    content=comment.content,
    user_id=user.id,
    shot_id=target_shot.id
  )
  db.add(new_comment)

  user.last_comment_at = datetime.now(timezone.utc).replace(tzinfo=None)
  await db.commit()

  return {"status": "Commented!",
          "content": comment.content,
          "shot_id with the comment": shot_uuid}


@app.post("/auth/register")
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
    raise HTTPException(status_code=400, detail="Username already taken.")

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




@app.post("/auth/login")
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
      status_code=401,
      detail=["Incorrect username or password"],
      headers={"WWW-Authenticate": "Bearer"}
    )

  # 3- Create JWT
  access_token = create_access_token(data={"sub": user.username})

  return {"access_token": access_token, "token_type": "bearer", "username": user.username}
