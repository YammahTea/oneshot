from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from contextlib import asynccontextmanager
import os

# Modules
from Back.core.database import create_db_and_tables
from Back.routers import login, profile, feed, interaction


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

# connecting routers
app.include_router(login.router)
app.include_router(profile.router)
app.include_router(feed.router)
app.include_router(interaction.router)