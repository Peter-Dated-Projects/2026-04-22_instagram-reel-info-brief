"""Transcription service using Google Cloud Speech-to-Text.

Handles both short (<1 min) and long audio files.
"""

import logging
from pathlib import Path

from google.cloud import speech

logger = logging.getLogger(__name__)


def transcribe_audio(audio_path: str) -> str:
    """Transcribe an audio file using Google Cloud Speech-to-Text.

    Uses synchronous recognition for short audio (<1 min)
    and long_running_recognize for longer audio.

    Args:
        audio_path: Path to the WAV audio file (16kHz mono PCM)

    Returns:
        Full transcript as a string
    """
    client = speech.SpeechClient()

    audio_path = Path(audio_path)
    with open(audio_path, "rb") as f:
        content = f.read()

    audio = speech.RecognitionAudio(content=content)

    config = speech.RecognitionConfig(
        encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
        sample_rate_hertz=16000,
        language_code="en-US",
        enable_automatic_punctuation=True,
        model="latest_long",
    )

    # Check file size to determine sync vs async
    # Sync API limit is ~1 minute of audio (~960KB for 16kHz mono 16-bit)
    file_size = audio_path.stat().st_size

    if file_size < 960_000:
        # Short audio: synchronous recognition
        logger.info("Using synchronous recognition (short audio)")
        response = client.recognize(config=config, audio=audio)
    else:
        # Long audio: asynchronous recognition
        logger.info("Using long-running recognition (long audio)")
        operation = client.long_running_recognize(config=config, audio=audio)
        response = operation.result(timeout=300)

    # Combine all results into one transcript
    transcript_parts = []
    for result in response.results:
        if result.alternatives:
            transcript_parts.append(result.alternatives[0].transcript)

    transcript = " ".join(transcript_parts)

    if not transcript.strip():
        logger.warning("No transcript was generated — audio may be silent or non-English")
        return "(No speech detected in this reel)"

    logger.info(f"Transcription complete: {len(transcript)} characters")
    return transcript
