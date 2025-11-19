from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from pydantic_settings import BaseSettings
from typing import AsyncGenerator

class Settings(BaseSettings):
    # Required env variables (no default → must come from .env or real env)
    DATABASE_URL: str
    REDIS_URL: str
    REDIS_RESULT_BACKEND: str

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

# Load all settings
settings = Settings()

# --- Database setup ---
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    future=True,
)

AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

Base = declarative_base()

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session
