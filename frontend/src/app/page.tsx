"use client";

import { useState, useCallback } from "react";
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

interface StepInfo {
  step: number;
  label: string;
}

export default function Home() {
  const [user, setUser] = useState<string | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<StepInfo | null>(null);
  const [cached, setCached] = useState(false);

  // Progressive data
  const [videoId, setVideoId] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<ReelMetadata | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [keyLists, setKeyLists] = useState<KeyList[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = (username: string) => {
    setUser(username);
    setShowLogin(false);
  };

  const resetState = useCallback(() => {
    setVideoId(null);
    setMetadata(null);
    setTranscript(null);
    setSummary(null);
    setKeyLists([]);
    setCurrentStep(null);
    setCached(false);
    setError(null);
  }, []);

  const handleAnalyze = useCallback(async (url: string) => {
    resetState();
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "text/event-stream",
        },
        body: JSON.stringify({ url }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `Server error (${res.status})`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("Failed to get response stream");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events from buffer
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep incomplete line in buffer

        let currentEvent = "";
        for (const line of lines) {
          if (line.startsWith("event:")) {
            currentEvent = line.slice(6).trim();
          } else if (line.startsWith("data:") && currentEvent) {
            const dataStr = line.slice(5).trim();
            try {
              const data = JSON.parse(dataStr);
              handleSSEEvent(currentEvent, data);
            } catch {
              // Ignore unparseable data
            }
            currentEvent = "";
          }
        }
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setError(message);
    } finally {
      setLoading(false);
      setCurrentStep(null);
    }
  }, [resetState]);

  const handleSSEEvent = (event: string, data: Record<string, unknown>) => {
    switch (event) {
      case "step":
        setCurrentStep(data as unknown as StepInfo);
        break;

      case "video":
        setVideoId(data.video_id as string);
        break;

      case "metadata":
        setMetadata(data as unknown as ReelMetadata);
        break;

      case "transcript":
        setTranscript(data.transcript as string);
        break;

      case "summary":
        setSummary(data.summary as string);
        break;

      case "lists":
        setKeyLists(data.key_lists as KeyList[]);
        break;

      case "cached":
        setCached(true);
        setVideoId(data.video_id as string);
        setMetadata((data as Record<string, unknown>).metadata as unknown as ReelMetadata);
        setTranscript(data.transcript as string);
        setSummary(data.summary as string);
        setKeyLists(data.key_lists as KeyList[]);
        break;

      case "error":
        setError(data.detail as string);
        break;

      case "done":
        break;
    }
  };

  // Show login modal
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

      {/* Pipeline Progress */}
      {loading && currentStep && (
        <div className="progress-bar">
          <div className="progress-bar__inner">
            <div className="spinner spinner--dark" />
            <span className="progress-bar__label">
              Step {currentStep.step}/4 — {currentStep.label}
            </span>
            {cached && (
              <span className="progress-bar__badge">Cached</span>
            )}
          </div>
        </div>
      )}

      {/* Cached indicator */}
      {!loading && cached && (
        <div className="progress-bar">
          <div className="progress-bar__inner">
            <span className="progress-bar__badge">⚡ Loaded from cache — previously analyzed</span>
          </div>
        </div>
      )}

      {/* Three-Panel Layout */}
      <main className="main-content">
        <VideoPanel
          videoId={videoId}
          loading={loading && !videoId}
        />
        <InfoPanel
          metadata={metadata}
          transcript={transcript}
          loading={loading && !metadata}
        />
        <InsightsPanel
          summary={summary}
          keyLists={keyLists}
          loading={loading && !summary}
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
