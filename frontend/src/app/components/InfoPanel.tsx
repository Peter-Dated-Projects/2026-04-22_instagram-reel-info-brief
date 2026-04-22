"use client";

import { useState } from "react";

interface ReelMetadata {
  username: string;
  description: string;
  title: string;
  thumbnail_url: string | null;
  like_count: number | null;
  view_count: number | null;
  comment_count: number | null;
}

interface InfoPanelProps {
  metadata: ReelMetadata | null;
  transcript: string | null;
  loading: boolean;
}

function formatCount(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

export default function InfoPanel({
  metadata,
  transcript,
  loading,
}: InfoPanelProps) {
  const [showTranscript, setShowTranscript] = useState(false);

  if (loading) {
    return (
      <div className="panel info-panel">
        <div className="panel__header">
          <div className="panel__header-icon panel__header-icon--info">ℹ</div>
          <span className="panel__header-title">Reel Info</span>
        </div>
        <div className="panel__body">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              className="skeleton"
              style={{ width: 48, height: 48, borderRadius: "50%" }}
            />
            <div style={{ flex: 1 }}>
              <div className="skeleton skeleton--heading" />
              <div className="skeleton skeleton--text" style={{ width: "50%" }} />
            </div>
          </div>
          <div className="skeleton skeleton--block" />
          <div className="skeleton skeleton--text" />
          <div className="skeleton skeleton--text" />
          <div className="skeleton skeleton--text" />
        </div>
      </div>
    );
  }

  if (!metadata) {
    return (
      <div className="panel info-panel">
        <div className="panel__header">
          <div className="panel__header-icon panel__header-icon--info">ℹ</div>
          <span className="panel__header-title">Reel Info</span>
        </div>
        <div className="panel__body">
          <div className="empty-state">
            <div className="empty-state__icon">📋</div>
            <div className="empty-state__text">
              Reel details will appear here once you analyze a URL.
            </div>
          </div>
        </div>
      </div>
    );
  }

  const initial = metadata.username.charAt(0).toUpperCase();

  return (
    <div className="panel info-panel">
      <div className="panel__header">
        <div className="panel__header-icon panel__header-icon--info">ℹ</div>
        <span className="panel__header-title">Reel Info</span>
      </div>
      <div className="panel__body">
        {/* User */}
        <div className="info-user">
          <div className="info-user__avatar">{initial}</div>
          <div>
            <div className="info-user__name">{metadata.username}</div>
            <div className="info-user__handle">@{metadata.username}</div>
          </div>
        </div>

        {/* Description */}
        {metadata.description && (
          <div className="info-description">{metadata.description}</div>
        )}

        {/* Stats */}
        <div className="info-stats">
          <div className="info-stat">
            <span className="info-stat__value">
              {formatCount(metadata.like_count)}
            </span>
            <span className="info-stat__label">Likes</span>
          </div>
          <div className="info-stat">
            <span className="info-stat__value">
              {formatCount(metadata.view_count)}
            </span>
            <span className="info-stat__label">Views</span>
          </div>
          <div className="info-stat">
            <span className="info-stat__value">
              {formatCount(metadata.comment_count)}
            </span>
            <span className="info-stat__label">Comments</span>
          </div>
        </div>

        {/* Transcript */}
        {transcript && (
          <div className="transcript-section">
            <button
              className="transcript-toggle"
              onClick={() => setShowTranscript(!showTranscript)}
            >
              <span>📝 Transcript</span>
              <span
                className={`transcript-toggle__chevron ${
                  showTranscript ? "transcript-toggle__chevron--open" : ""
                }`}
              >
                ▼
              </span>
            </button>
            {showTranscript && (
              <div className="transcript-content">{transcript}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
