import uuid
from sqlalchemy import String, DateTime, Uuid, ForeignKey
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from datetime import datetime, timezone


class Base(DeclarativeBase):
  pass

class User(Base):

  __tablename__ = "users"
  # User ID
  id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
  # Username
  username: Mapped[str] = mapped_column(String(24), unique=True, index=True)

  # Last act from the user
  # nullable = True because of first time users
  last_post_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
  last_like_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
  last_comment_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

  # Relationships (link with "shots" db)
  shots = relationship("Shot", back_populates="owner")

class Shot(Base):
  __tablename__ = "shots"

  # Shot ID
  id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)

  # Shot image url, caption and creation date
  caption: Mapped[str] = mapped_column(String(50))
  created_at: Mapped[datetime] = mapped_column(DateTime, default= lambda : datetime.now(timezone.utc))
  image_url: Mapped[str | None] = mapped_column(String, nullable=True)

  # User ID who owns the shot
  user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id"))

  # Relationship with User + Comment + Like
  owner = relationship("User", back_populates="shots")
  comments = relationship("Comment", back_populates="shot")
  likes = relationship("Like", back_populates="shot")

class Comment(Base):
  __tablename__ = "comments"

  id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
  content: Mapped[str] = mapped_column(String(100))

  # Links
  user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id"))
  shot_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("shots.id"))

  shot = relationship("Shot", back_populates="comments")
  owner = relationship("User") # to be able to access the user's name who posted the comment

class Like(Base):

  __tablename__ = "likes"

  id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)

  user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id"))
  shot_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("shots.id"))

  shot = relationship("Shot", back_populates="likes")
