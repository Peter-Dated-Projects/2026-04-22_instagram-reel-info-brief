"""Instagram Reel Info Brief — FastAPI Backend.

Orchestrates the full pipeline: login → download → extract audio → transcribe → analyze.
"""

import os
import logging
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

# Set GOOGLE_APPLICATION_CREDENTIALS before importing google libs
gcp_key = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
if gcp_key:
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = str(Path(gcp_key).resolve())

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from models import AnalyzeRequest, AnalyzeResponse, ReelMetadata, LoginRequest, LoginResponse
from services.instagram_auth import auth_service
from services.downloader import download_reel
from services.audio import extract_audio
from services.transcriber import transcribe_audio
from services.analyzer import generate_summary, extract_lists

# Logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger(__name__)

# App
app = FastAPI(
    title="Instagram Reel Info Brief",
    description="Analyze Instagram Reels with AI-powered insights",
    version="1.0.0",
)

# CORS — allow frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MEDIA_DIR = Path(os.getenv("MEDIA_DIR", "./media"))
MEDIA_DIR.mkdir(exist_ok=True)


@app.get("/api/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok"}


@app.post("/api/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """Authenticate with Instagram."""
    # Try loading existing session first
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


@app.post("/api/analyze", response_model=AnalyzeResponse)
async def analyze_reel(request: AnalyzeRequest):
    """Full analysis pipeline for an Instagram reel.

    Steps:
    1. Download video + extract metadata (yt-dlp)
    2. Extract audio (ffmpeg)
    3. Transcribe audio (Google STT)
    4. Generate summary + lists (Ollama gemma4:e4b)
    """
    if not auth_service.is_authenticated:
        raise HTTPException(status_code=401, detail="Not authenticated. Please login first.")

    # Validate URL
    url = request.url.strip()
    if "instagram.com" not in url:
        raise HTTPException(status_code=400, detail="Invalid URL. Please provide an Instagram reel URL.")

    try:
        # Step 1: Download reel
        logger.info(f"[1/4] Downloading reel: {url}")
        cookie_jar = auth_service.get_cookie_jar_path()
        result = download_reel(url, cookie_jar)
        video_id = result["video_id"]
        video_path = result["video_path"]
        metadata_dict = result["metadata"]

        # Step 2: Extract audio
        logger.info("[2/4] Extracting audio...")
        audio_path = extract_audio(video_path)

        # Step 3: Transcribe
        logger.info("[3/4] Transcribing audio...")
        transcript = transcribe_audio(audio_path)

        # Step 4: Analyze with LLM
        logger.info("[4/4] Generating AI insights...")
        summary = await generate_summary(transcript, metadata_dict.get("description", ""))
        key_lists = await extract_lists(transcript, metadata_dict.get("description", ""))

        # Build response
        metadata = ReelMetadata(**metadata_dict)

        logger.info(f"Analysis complete for reel {video_id}")
        return AnalyzeResponse(
            video_id=video_id,
            metadata=metadata,
            transcript=transcript,
            summary=summary,
            key_lists=key_lists,
        )

    except RuntimeError as e:
        logger.error(f"Pipeline error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")


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
