"use client";

interface VideoPanelProps {
  videoId: string | null;
  loading: boolean;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function VideoPanel({ videoId, loading }: VideoPanelProps) {
  return (
    <div className="panel video-panel">
      <div className="panel__header">
        <div className="panel__header-icon panel__header-icon--video">▶</div>
        <span className="panel__header-title">Reel Video</span>
      </div>
      <div className="panel__body">
        <div className="video-container">
          {loading ? (
            <div className="skeleton skeleton--video" />
          ) : videoId ? (
            <video
              src={`${API_BASE}/api/video/${videoId}`}
              controls
              autoPlay
              muted
              loop
              playsInline
            />
          ) : (
            <div className="video-placeholder">
              <div className="video-placeholder__icon">🎬</div>
              <div className="video-placeholder__text">
                Paste a Reel URL above to preview
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
