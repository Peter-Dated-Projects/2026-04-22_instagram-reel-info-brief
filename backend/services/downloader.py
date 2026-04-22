"""Video downloader service using yt-dlp.

Downloads Instagram reels and extracts metadata.
"""

import os
import uuid
import logging
from pathlib import Path

import yt_dlp

logger = logging.getLogger(__name__)

MEDIA_DIR = Path(os.getenv("MEDIA_DIR", "./media"))
MEDIA_DIR.mkdir(exist_ok=True)


def download_reel(url: str, cookie_jar_path: Path | None = None) -> dict:
    """Download an Instagram reel and extract metadata.

    Args:
        url: Instagram reel URL
        cookie_jar_path: Path to Netscape cookie jar file for authentication

    Returns:
        dict with keys: video_id, video_path, metadata
    """
    video_id = str(uuid.uuid4())[:8]
    output_path = MEDIA_DIR / f"{video_id}.mp4"

    ydl_opts = {
        "outtmpl": str(output_path),
        "format": "best[ext=mp4]/best",
        "quiet": True,
        "no_warnings": True,
    }

    if cookie_jar_path and cookie_jar_path.exists():
        ydl_opts["cookiefile"] = str(cookie_jar_path)
        logger.info(f"Using cookie jar: {cookie_jar_path}")

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            # Extract info first (includes metadata)
            info = ydl.extract_info(url, download=True)

            metadata = {
                "username": info.get("uploader") or info.get("uploader_id") or "unknown",
                "description": info.get("description") or "",
                "title": info.get("title") or info.get("fulltitle") or "",
                "thumbnail_url": info.get("thumbnail"),
                "like_count": info.get("like_count"),
                "view_count": info.get("view_count"),
                "comment_count": info.get("comment_count"),
            }

            logger.info(f"Downloaded reel to {output_path}")
            logger.info(f"Metadata: {metadata}")

            return {
                "video_id": video_id,
                "video_path": str(output_path),
                "metadata": metadata,
            }

    except yt_dlp.utils.DownloadError as e:
        logger.error(f"Download failed: {e}")
        raise RuntimeError(f"Failed to download reel: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error downloading reel: {e}")
        raise RuntimeError(f"Error downloading reel: {str(e)}")
