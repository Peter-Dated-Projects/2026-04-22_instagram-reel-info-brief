"""Instagram Reel Info Brief — FastAPI Backend.

Orchestrates the full pipeline with SSE streaming for progressive UI updates
and PostgreSQL-backed URL deduplication.
"""

import os
import json
import asyncio
import logging
from pathlib import Path
from contextlib import asynccontextmanager

from dotenv import load_dotenv

load_dotenv()

# Set GOOGLE_APPLICATION_CREDENTIALS before importing google libs
gcp_key = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
if gcp_key:
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = str(Path(gcp_key).resolve())

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sse_starlette.sse import EventSourceResponse

from models import AnalyzeRequest, LoginRequest, LoginResponse
from database import init_db, get_cached_reel, save_reel
from services.instagram_auth import auth_service
from services.downloader import download_reel
from services.audio import extract_audio
from services.transcriber import transcribe_audio
from services.analyzer import generate_summary, extract_lists

# Logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger(__name__)

MEDIA_DIR = Path(os.getenv("MEDIA_DIR", "./media"))
MEDIA_DIR.mkdir(exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize DB tables on startup."""
    await init_db()
    yield


# App
app = FastAPI(
    title="Instagram Reel Info Brief",
    description="Analyze Instagram Reels with AI-powered insights",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok"}


@app.post("/api/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """Authenticate with Instagram."""
    if auth_service.try_load_session(request.username):
        return LoginResponse(
            success=True,
            message="Session restored",
            username=request.username,
        )

    success, message = auth_service.login(request.username, request.password)
    return LoginResponse(
        success=success,
        message=message,
        username=request.username if success else None,
    )


@app.get("/api/session")
async def check_session():
    """Check if there's an active Instagram session."""
    return {
        "authenticated": auth_service.is_authenticated,
        "username": auth_service.current_user,
    }


@app.post("/api/analyze")
async def analyze_reel(request: AnalyzeRequest):
    """Full analysis pipeline for an Instagram reel, streamed via SSE.

    Events sent:
      - step: current pipeline step info
      - metadata: reel metadata (username, description, stats)
      - video: video_id for playback
      - transcript: speech-to-text result
      - summary: AI-generated summary
      - lists: extracted lists
      - done: pipeline complete
      - cached: entire result from cache (skip pipeline)
      - error: error message
    """
    url = request.url.strip()
    if "instagram.com" not in url:
        raise HTTPException(status_code=400, detail="Invalid URL. Please provide an Instagram reel URL.")

    async def event_generator():
        try:
            # ── Check cache first ──
            cached = await get_cached_reel(url)
            if cached:
                logger.info(f"Cache hit for URL: {url}")
                yield {
                    "event": "cached",
                    "data": json.dumps({
                        "video_id": cached.video_id,
                        "metadata": {
                            "username": cached.username or "unknown",
                            "description": cached.description or "",
                            "title": cached.title or "",
                            "thumbnail_url": cached.thumbnail_url,
                            "like_count": cached.like_count,
                            "view_count": cached.view_count,
                            "comment_count": cached.comment_count,
                        },
                        "transcript": cached.transcript or "",
                        "summary": cached.summary or "",
                        "key_lists": cached.key_lists or [],
                    }),
                }
                yield {"event": "done", "data": "{}"}
                return

            # ── Step 1: Download ──
            yield {"event": "step", "data": json.dumps({"step": 1, "label": "Downloading reel..."})}
            await asyncio.sleep(0)  # yield control so event flushes

            cookie_jar = None
            if auth_service.is_authenticated:
                try:
                    cookie_jar = auth_service.get_cookie_jar_path()
                except Exception:
                    cookie_jar = None

            result = await asyncio.to_thread(download_reel, url, cookie_jar)
            video_id = result["video_id"]
            video_path = result["video_path"]
            metadata_dict = result["metadata"]

            # Send video + metadata immediately
            yield {"event": "video", "data": json.dumps({"video_id": video_id})}
            yield {
                "event": "metadata",
                "data": json.dumps({
                    "username": metadata_dict.get("username", "unknown"),
                    "description": metadata_dict.get("description", ""),
                    "title": metadata_dict.get("title", ""),
                    "thumbnail_url": metadata_dict.get("thumbnail_url"),
                    "like_count": metadata_dict.get("like_count"),
                    "view_count": metadata_dict.get("view_count"),
                    "comment_count": metadata_dict.get("comment_count"),
                }),
            }

            # ── Step 2: Extract audio ──
            yield {"event": "step", "data": json.dumps({"step": 2, "label": "Extracting audio..."})}
            audio_path = await asyncio.to_thread(extract_audio, video_path)

            # ── Step 3: Transcribe ──
            yield {"event": "step", "data": json.dumps({"step": 3, "label": "Transcribing speech..."})}
            transcript = await asyncio.to_thread(transcribe_audio, audio_path)
            yield {"event": "transcript", "data": json.dumps({"transcript": transcript})}

            # ── Step 4: AI analysis ──
            yield {"event": "step", "data": json.dumps({"step": 4, "label": "Generating AI insights..."})}
            description = metadata_dict.get("description", "")

            # Run summary and lists in parallel
            summary_task = asyncio.create_task(generate_summary(transcript, description))
            lists_task = asyncio.create_task(extract_lists(transcript, description))

            summary = await summary_task
            yield {"event": "summary", "data": json.dumps({"summary": summary})}

            key_lists = await lists_task
            yield {"event": "lists", "data": json.dumps({"key_lists": key_lists})}

            # ── Save to DB ──
            await save_reel(url, {
                "video_id": video_id,
                "username": metadata_dict.get("username"),
                "description": metadata_dict.get("description"),
                "title": metadata_dict.get("title"),
                "thumbnail_url": metadata_dict.get("thumbnail_url"),
                "like_count": metadata_dict.get("like_count"),
                "view_count": metadata_dict.get("view_count"),
                "comment_count": metadata_dict.get("comment_count"),
                "transcript": transcript,
                "summary": summary,
                "key_lists": key_lists,
            })

            yield {"event": "done", "data": "{}"}

        except Exception as e:
            logger.error(f"Pipeline error: {e}", exc_info=True)
            yield {"event": "error", "data": json.dumps({"detail": str(e)})}

    return EventSourceResponse(event_generator())


@app.get("/api/video/{video_id}")
async def serve_video(video_id: str):
    """Serve a downloaded reel video file."""
    video_path = MEDIA_DIR / f"{video_id}.mp4"
    if not video_path.exists():
        raise HTTPException(status_code=404, detail="Video not found")
    return FileResponse(
        str(video_path),
        media_type="video/mp4",
        headers={"Accept-Ranges": "bytes"},
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
