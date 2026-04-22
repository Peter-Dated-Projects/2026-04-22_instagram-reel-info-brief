#!/bin/bash
# ─── Instagram Reel Info Brief — Startup Script ───

set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

cleanup() {
    echo ""
    echo "🛑 Shutting down..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    wait $BACKEND_PID $FRONTEND_PID 2>/dev/null
    echo "✅ All processes stopped."
}
trap cleanup EXIT INT TERM

# ─── Backend ───
echo "🚀 Starting backend (FastAPI) on :8000..."
cd "$ROOT_DIR/backend"
uv run uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!

# ─── Frontend ───
echo "🚀 Starting frontend (Next.js) on :3000..."
cd "$ROOT_DIR/frontend"
npm run dev -- -p 3000 &
FRONTEND_PID=$!

echo ""
echo "═══════════════════════════════════════"
echo "  ✦ Reel Brief is running!"
echo "  Frontend → http://localhost:3000"
echo "  Backend  → http://localhost:8000"
echo "  Press Ctrl+C to stop both servers."
echo "═══════════════════════════════════════"
echo ""

wait
