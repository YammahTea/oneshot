from fastapi import Depends, APIRouter

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload
from sqlalchemy import select

# Modules
from Back.core.database import get_db
from Back.core.models import Shot, Comment

""" Router for displaying shots in feed """
router = APIRouter(
  tags=["HandleShotsInFeed"]
)


""" Endpoint to display shots in the home page (feed) """
@router.get("/shots")
async def shots(
        page: int = 1, # default one page
        limit: int = 10, # 10 items per page
        db: AsyncSession = Depends(get_db)):
  
  """
  1-Grab 10 shots from the database by the created_at
  2-link Shot with User db to avoid N+1 problem
  3-Load shots data in as a JSON in an array
  """
  
  # 1- Calculate how many items to skip
  # page 1 -> skip 0 || page 2 -> skip 10 || page 3 -> skip 20 || etc...
  offset = (page - 1) * limit
  
  
  # 2-Grab 10 shots
  # 3-Join User db to the shots
  query = (
    select(Shot)
    .options(
      joinedload(Shot.owner), # Load Shot owner
      joinedload(Shot.likes), # Load Likes
      selectinload(Shot.comments).joinedload(Comment.owner)) # Load Comments AND the User who wrote each comment
    .order_by(Shot.created_at.desc())
    .offset(offset)
    .limit(limit)
  )
  
  result = await db.execute(query)
  shots_list = result.scalars().unique().all()
  
  # Load shots data as a JSON in an array
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