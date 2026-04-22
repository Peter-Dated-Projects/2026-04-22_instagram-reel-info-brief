"""Audio extraction service using ffmpeg.

Extracts audio from video files and converts to format suitable for Google STT.
"""

import subprocess
import logging
from pathlib import Path

logger = logging.getLogger(__name__)


def extract_audio(video_path: str) -> str:
    """Extract audio from video file using ffmpeg.

    Converts to 16kHz mono WAV for Google Speech-to-Text compatibility.

    Args:
        video_path: Path to the input video file

    Returns:
        Path to the extracted WAV audio file
    """
    video_path = Path(video_path)
    audio_path = video_path.with_suffix(".wav")

    cmd = [
        "ffmpeg",
        "-i", str(video_path),
        "-vn",                    # No video
        "-acodec", "pcm_s16le",   # 16-bit PCM
        "-ar", "16000",           # 16kHz sample rate
        "-ac", "1",               # Mono
        "-y",                     # Overwrite output
        str(audio_path),
    ]

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=60,
        )

        if result.returncode != 0:
            logger.error(f"ffmpeg stderr: {result.stderr}")
            raise RuntimeError(f"ffmpeg failed with code {result.returncode}: {result.stderr}")

        if not audio_path.exists():
            raise RuntimeError("Audio file was not created")

        logger.info(f"Extracted audio to {audio_path}")
        return str(audio_path)

    except subprocess.TimeoutExpired:
        raise RuntimeError("Audio extraction timed out (60s limit)")
    except FileNotFoundError:
        raise RuntimeError("ffmpeg not found. Please install ffmpeg and ensure it's on PATH.")
