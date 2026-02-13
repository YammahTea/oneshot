from fastapi import status, HTTPException, Depends, File, UploadFile, Form, APIRouter

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from datetime import datetime, timezone
from pydantic import BaseModel
import uuid

# Modules
from Back.core.database import get_db
from Back.core.models import User, Shot, Comment, Like
from Back.services.redis_client import get_redis
from Back.core.storage import save_file
from Back.services.handle import check_daily_limit
from Back.dependencies import get_current_user
from Back.services.rate_limiter import check_user_cooldown

""" Router for handling interacting with shots, upload, comment, like and delete """
router = APIRouter(
  tags=["HandleShotInteraction"]
)


""" BaseModel to validate user input type """
class CommentCreate(BaseModel):
  content: str


""" Endpoint to create a shot (post) """
@router.post("/post")
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
    raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="You have already made your post for the day.")
  
  # 3- Process image (if it exists)
  
  image_url = None
  if image:
    
    # ============== Security check ============
    ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"]
    
    if image.content_type not in ALLOWED_TYPES:
      raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
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


""" Endpoint to add a like to a shot (post) """
@router.post("/shot/{shot_id}/like")
async def like_shot(
        shot_id: str,
        user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
        redis = Depends(get_redis)
):
  
  """
  1- Check limits (if user already liked today)
  2- Check if Shot exists
  3- Check if shot is already liked by the current user
  4- Update "Like" db
  5- Update last_like_at for the user
  6- Return status and number of likes left for the user
  """
  
  # 1- Check limits
  # 1.1- With redis
  await check_user_cooldown(user.id, redis)
  
  # 1.2- With database
  can_like = check_daily_limit(user.last_like_at)
  if not can_like:
    raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="You already used your One Like for today.")
  
  # 1.5- Check if the provided shot ID is valid
  try:
    shot_uuid = uuid.UUID(shot_id) # convert from str to uuid
  except ValueError:
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Shot ID format")
  
  # 2- Check if shot exists
  result = await db.execute(select(Shot).where(Shot.id == shot_uuid))
  target_shot = result.scalars().first()
  
  if not target_shot:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="This Shot doesn't even exist...")
  
  # 3- Check if already liked
  # We look for a Like entry that matches BOTH this user AND this shot
  result = await db.execute(
    select(Like).where(
      Like.user_id == user.id,
      Like.shot_id == target_shot.id
    )
  )
  existing_like = result.scalars().first()
  
  if existing_like:
    # Raise an error (Prevent duplicates)
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You already liked this shot! Are you trying to support it that much?")
  
  """ TO DO: ADD OPTION TO UNLIKE """
  
  # 4- Create like + add like to db and updated last act
  new_like = Like(user_id= user.id, shot_id = target_shot.id)
  db.add(new_like)
  
  user.last_like_at = datetime.now(timezone.utc).replace(tzinfo=None)
  
  await db.commit()
  
  return {"status": f"Liked! the post with the id {target_shot.id}",
          "remaining likes for the user": 0}


""" Endpoint to add a comment to a shot (post) """
@router.post("/shot/{shot_id}/comment")
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
    raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="You already used your One Comment for today.")
  
  # 1.5- Check if the provided shot ID is valid
  try:
    shot_uuid = uuid.UUID(shot_id) # convert from str to uuid
  except ValueError:
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Shot ID")
  
  # 2- Check if shot exists
  result = await db.execute(select(Shot).where(Shot.id == shot_uuid))
  target_shot = result.scalars().first()
  
  if not target_shot:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shot not found")
  
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


""" Endpoint to delete a shot (post) """
@router.delete("/shot/{shot_id}/delete")
async def delete_shot(
        shot_id: str,
        user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db)
):
  
  # 1- Convert string to UUID
  try:
    shot_uuid = uuid.UUID(shot_id)
  except ValueError:
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Shot ID format")
  
  # 2- Find shot
  result = await db.execute(select(Shot).where(Shot.id == shot_uuid))
  shot_to_delete = result.scalars().first()
  
  # 3- Check if shot exists
  if not shot_to_delete:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shot doesn't exist")
  
  # 4- Check if the shot belongs to the user
  if shot_to_delete.user_id != user.id:
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete this shot")
  
  # 5- Delete the shot
  await db.delete(shot_to_delete)
  await db.commit()
  
  return {"message": "Shot has been deleted successfully"}