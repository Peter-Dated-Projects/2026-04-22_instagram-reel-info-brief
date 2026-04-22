"""Database module for URL tracking and result caching.

Uses PostgreSQL via SQLAlchemy async to store processed reel data.
"""

import os
import json
import logging
from datetime import datetime, timezone

from sqlalchemy import Column, String, Text, DateTime, Integer, JSON
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase

logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://reelbrief:reelbrief@localhost:5432/reelbrief",
)

engine = create_async_engine(DATABASE_URL, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


class ProcessedReel(Base):
    """Stores processed reel data to avoid duplicate processing."""

    __tablename__ = "processed_reels"

    # Normalized URL as primary key (stripped of query params, trailing slashes)
    url = Column(String(1024), primary_key=True)
    video_id = Column(String(16), nullable=False)
    username = Column(String(256), nullable=True)
    description = Column(Text, nullable=True)
    title = Column(String(512), nullable=True)
    thumbnail_url = Column(Text, nullable=True)
    like_count = Column(Integer, nullable=True)
    view_count = Column(Integer, nullable=True)
    comment_count = Column(Integer, nullable=True)
    transcript = Column(Text, nullable=True)
    summary = Column(Text, nullable=True)
    key_lists = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


def normalize_url(url: str) -> str:
    """Normalize an Instagram URL to prevent duplicates.

    Strips query params, fragments, trailing slashes, and normalizes the path.
    """
    from urllib.parse import urlparse, urlunparse

    parsed = urlparse(url.strip())
    # Keep only scheme + netloc + path, drop query/fragment
    clean = urlunparse((parsed.scheme, parsed.netloc, parsed.path.rstrip("/"), "", "", ""))
    return clean


async def init_db():
    """Create tables if they don't exist."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables initialized")


async def get_cached_reel(url: str) -> ProcessedReel | None:
    """Look up a previously processed reel by normalized URL."""
    normalized = normalize_url(url)
    async with async_session() as session:
        result = await session.get(ProcessedReel, normalized)
        return result


async def save_reel(url: str, data: dict):
    """Save a processed reel to the database."""
    normalized = normalize_url(url)
    async with async_session() as session:
        reel = ProcessedReel(
            url=normalized,
            video_id=data.get("video_id", ""),
            username=data.get("username"),
            description=data.get("description"),
            title=data.get("title"),
            thumbnail_url=data.get("thumbnail_url"),
            like_count=data.get("like_count"),
            view_count=data.get("view_count"),
            comment_count=data.get("comment_count"),
            transcript=data.get("transcript"),
            summary=data.get("summary"),
            key_lists=data.get("key_lists"),
        )
        await session.merge(reel)
        await session.commit()
        logger.info(f"Saved reel to DB: {normalized}")
