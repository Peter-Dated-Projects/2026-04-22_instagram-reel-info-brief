"use client";

import { useState } from "react";
import LoginGate from "./components/LoginGate";
import UrlInput from "./components/UrlInput";
import VideoPanel from "./components/VideoPanel";
import InfoPanel from "./components/InfoPanel";
import InsightsPanel from "./components/InsightsPanel";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface ReelMetadata {
  username: string;
  description: string;
  title: string;
  thumbnail_url: string | null;
  like_count: number | null;
  view_count: number | null;
  comment_count: number | null;
}

interface KeyList {
  title: string;
  items: string[];
}

interface AnalysisResult {
  video_id: string;
  metadata: ReelMetadata;
  transcript: string;
  summary: string;
  key_lists: KeyList[];
}

export default function Home() {
  const [user, setUser] = useState<string | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = (username: string) => {
    setUser(username);
    setShowLogin(false);
  };

  const handleAnalyze = async (url: string) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`${API_BASE}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `Server error (${res.status})`);
      }

      const data: AnalysisResult = await res.json();
      setResult(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // Show login modal if user clicked the login button
  if (showLogin) {
    return (
      <LoginGate
        onLogin={handleLogin}
        onSkip={() => setShowLogin(false)}
      />
    );
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header__logo">
          <div className="header__icon">✦</div>
          <div>
            <div className="header__title">Reel Brief</div>
            <div className="header__subtitle">AI-Powered Reel Insights</div>
          </div>
        </div>
        {user ? (
          <div className="header__user">
            <span className="header__user-dot" />
            @{user}
          </div>
        ) : (
          <button
            className="btn btn--login-header"
            onClick={() => setShowLogin(true)}
          >
            🔒 Login for private reels
          </button>
        )}
      </header>

      {/* URL Input */}
      <UrlInput onSubmit={handleAnalyze} loading={loading} />

      {/* Three-Panel Layout */}
      <main className="main-content">
        <VideoPanel videoId={result?.video_id ?? null} loading={loading} />
        <InfoPanel
          metadata={result?.metadata ?? null}
          transcript={result?.transcript ?? null}
          loading={loading}
        />
        <InsightsPanel
          summary={result?.summary ?? null}
          keyLists={result?.key_lists ?? []}
          loading={loading}
        />
      </main>

      {/* Error Toast */}
      {error && (
        <div className="error-toast">
          {error}
          <button
            className="error-toast__close"
            onClick={() => setError(null)}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
