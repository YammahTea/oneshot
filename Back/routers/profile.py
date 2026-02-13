from fastapi import status, HTTPException, Depends, APIRouter, File, UploadFile

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload
from sqlalchemy import select

from datetime import datetime

# Modules
from Back.core.models import User, Shot, Comment
from Back.core.database import get_db
from Back.core.storage import save_file
from Back.dependencies import get_current_user

""" Router for all profile page related endpoints """
router = APIRouter(
  tags=["Profile"]
)


""" Used for checking if an image is within the allowed extensions """
ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"]


""" Endpoint to fetch current user shots """
@router.get("/myshots")
async def get_my_shots(
        page: int = 1, # default one page
        limit: int = 10, # 10 items per page
        user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db)
):
  """
  Fetch ONLY the shots belonging to the currently logged in user.
  10 shots per load
  """
  offset = (page -1) * limit
  
  query = (
    select(Shot)
    .options(
      joinedload(Shot.owner),
      joinedload(Shot.likes),
      selectinload(Shot.comments).joinedload(Comment.owner)) # Load Comments AND the User who wrote each comment
    .where(Shot.user_id == user.id)
    .order_by(Shot.created_at.desc())
    .offset(offset)
    .limit(limit)
  )
  
  result = await db.execute(query)
  user_shots_list = result.scalars().unique().all()
  
  shots_data = []
  
  for shot in user_shots_list:
    shots_data.append({
      "id": str(shot.id),
      "caption": shot.caption,
      "created_at": shot.created_at.isoformat(),
      
      "owner": shot.owner.username,
      "owner_id": str(shot.owner.id),
      
      "owner_avatar": shot.owner.avatar_url,
      
      "like_count": len(shot.likes),
      
      # Array of comments
      "comments": [
        {
          "id": str(c.id),
          "owner": c.owner.username,
          "content": c.content
        }
        for c in shot.comments
      ],
      
      "image_url": shot.image_url
    })
  
  return shots_data


""" Endpoint to upload profile picture in the profile page """
@router.post("/profile/avatar")
async def upload_avatar(
        pfp_image: UploadFile = File(...),
        user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db)
):
  """
  Upload a profile picture
  1- Validate image
  2- Save image in R2
  3- Update user db with the avatar_url
  """
  
  # 1- Validate image
  if pfp_image.content_type not in ALLOWED_TYPES:
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid file type. Only JPEG, PNG, and WEBP images are allowed")
  
  # 2- save image
  file_extension = pfp_image.filename.split(".")[-1]
  unique_name = f"avatar_{user.id}_{int(datetime.now().timestamp())}.{file_extension}"
  
  avatar_url = save_file(pfp_image, unique_name)
  
  # 3- update user db
  user.avatar_url = avatar_url
  await db.commit()
  
  return {"message": "Avatar updated", "avatar_url": avatar_url}