"""Transcription service using faster-whisper (local whisper.cpp via CTranslate2).

Runs fully locally with no API limits or file size restrictions.
"""

import logging
from pathlib import Path

from faster_whisper import WhisperModel

logger = logging.getLogger(__name__)

# Load model once at import time — "base" is fast and accurate enough for reels
# Options: tiny, base, small, medium, large-v3
_model: WhisperModel | None = None


def _get_model() -> WhisperModel:
    """Lazy-load the Whisper model."""
    global _model
    if _model is None:
        logger.info("Loading Whisper model (base)...")
        _model = WhisperModel("base", device="cpu", compute_type="int8")
        logger.info("Whisper model loaded.")
    return _model


def transcribe_audio(audio_path: str) -> str:
    """Transcribe an audio file using faster-whisper (local).

    Args:
        audio_path: Path to the audio file (WAV, MP3, etc.)

    Returns:
        Full transcript as a string
    """
    audio_path = Path(audio_path)
    if not audio_path.exists():
        raise RuntimeError(f"Audio file not found: {audio_path}")

    model = _get_model()

    logger.info(f"Transcribing: {audio_path}")
    segments, info = model.transcribe(
        str(audio_path),
        language="en",
        beam_size=5,
        vad_filter=True,  # Filter out silence
    )

    # Collect all segment texts
    transcript_parts = []
    for segment in segments:
        transcript_parts.append(segment.text.strip())

    transcript = " ".join(transcript_parts)

    if not transcript.strip():
        logger.warning("No transcript generated — audio may be silent or non-English")
        return "(No speech detected in this reel)"

    logger.info(f"Transcription complete: {len(transcript)} chars, language={info.language} (prob={info.language_probability:.2f})")
    return transcript
