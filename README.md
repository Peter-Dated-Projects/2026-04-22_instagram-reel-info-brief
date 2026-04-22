# Instagram Reel Info Brief

Analyze Instagram Reels with AI-powered insights. This project provides a full-stack web application that allows users to input an Instagram Reel URL, downloads the video, extracts and locally transcribes the audio using `faster-whisper`, and generates structured summaries and key takeaways using an AI model.

The application features progressive updates via Server-Sent Events (SSE) and caches processed reels in a local PostgreSQL database to avoid redundant work.

## Features
- **Local Transcription**: Uses `faster-whisper` for fast, cost-effective, and private speech-to-text processing.
- **AI-Powered Insights**: Generates structured, copy-pastable markdown summaries and key lists.
- **Real-Time UI**: Streams progress updates from the backend to the frontend using SSE.
- **Smart Caching**: PostgreSQL-backed caching for URLs, bypassing the pipeline for previously processed reels.
- **Concurrent Processing Queue**: Uses an asyncio semaphore to limit concurrent transcribing/processing jobs and handle high traffic gracefully.

## Tech Stack

### Frontend
- Next.js (React)
- React Markdown (for rich rendering of AI insights)

### Backend
- FastAPI (Python)
- `faster-whisper` (Local STT)
- `yt-dlp` & `instaloader` (Media fetching)
- PostgreSQL & SQLAlchemy (Database / Caching)

## Setup

### Prerequisites
- [Docker](https://www.docker.com/) (for running the PostgreSQL database container)
- [uv](https://github.com/astral-sh/uv) (for Python dependency management)
- Node.js & npm
- FFmpeg (required for audio extraction)

### Environment Variables
You will need to set up appropriate environment variables in `backend/.env` for AI API access and configurations (e.g., Google Cloud STT keys if falling back, or OpenAI API keys if used by the analyzer).

## How to Run Development Environment

We provide a convenient shell script to start all services simultaneously.

1. Ensure Docker is running.
2. Run the startup script:

```bash
./run.sh
```

This script will automatically:
- Start the PostgreSQL database container (`localhost:5432`).
- Start the FastAPI backend on `http://localhost:8000`.
- Start the Next.js frontend on `http://localhost:3000`.

To shut down the servers, simply press `Ctrl+C`. You can stop the database container later with `docker compose down`.
