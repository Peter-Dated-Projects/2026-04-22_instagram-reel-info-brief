"use client";

import { useState, useCallback, useRef } from "react";
import LoginGate from "./components/LoginGate";
import UrlInput from "./components/UrlInput";
import JobCard from "./components/JobCard";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface ReelMetadata {
  username: string;
  description: string;
  title: string;
  thumbnail_url: string | null;
  like_count: number | null;
  view_count: number | null;
  comment_count: number | null;
}

export interface KeyList {
  title: string;
  items: string[];
}

export interface Job {
  id: string;
  url: string;
  status: "queued" | "processing" | "done" | "error" | "cached";
  step: { step: number; label: string } | null;
  videoId: string | null;
  metadata: ReelMetadata | null;
  transcript: string | null;
  summary: string | null;
  keyLists: KeyList[];
  error: string | null;
  startedAt: number;
}

let jobCounter = 0;

export default function Home() {
  const [user, setUser] = useState<string | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const activeStreams = useRef<Set<string>>(new Set());

  const handleLogin = (username: string) => {
    setUser(username);
    setShowLogin(false);
  };

  const updateJob = useCallback((jobId: string, updates: Partial<Job>) => {
    setJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, ...updates } : j))
    );
  }, []);

  const processJob = useCallback(
    async (job: Job) => {
      if (activeStreams.current.has(job.id)) return;
      activeStreams.current.add(job.id);

      try {
        const res = await fetch(`${API_BASE}/api/analyze`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
          },
          body: JSON.stringify({ url: job.url }),
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
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          let currentEvent = "";
          for (const line of lines) {
            if (line.startsWith("event:")) {
              currentEvent = line.slice(6).trim();
            } else if (line.startsWith("data:") && currentEvent) {
              const dataStr = line.slice(5).trim();
              try {
                const data = JSON.parse(dataStr);
                handleSSEEvent(job.id, currentEvent, data);
              } catch {
                // skip
              }
              currentEvent = "";
            }
          }
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "An unexpected error occurred";
        updateJob(job.id, { status: "error", error: message, step: null });
      } finally {
        activeStreams.current.delete(job.id);
      }
    },
    [updateJob]
  );

  const handleSSEEvent = useCallback(
    (jobId: string, event: string, data: Record<string, unknown>) => {
      switch (event) {
        case "queued":
          updateJob(jobId, {
            status: "queued",
            step: {
              step: 0,
              label: `Queued (position ${data.position})...`,
            },
          });
          break;
        case "step":
          updateJob(jobId, {
            status: "processing",
            step: data as unknown as { step: number; label: string },
          });
          break;
        case "video":
          updateJob(jobId, { videoId: data.video_id as string });
          break;
        case "metadata":
          updateJob(jobId, {
            metadata: data as unknown as ReelMetadata,
          });
          break;
        case "transcript":
          updateJob(jobId, { transcript: data.transcript as string });
          break;
        case "summary":
          updateJob(jobId, { summary: data.summary as string });
          break;
        case "lists":
          updateJob(jobId, { keyLists: data.key_lists as KeyList[] });
          break;
        case "cached":
          updateJob(jobId, {
            status: "cached",
            step: null,
            videoId: data.video_id as string,
            metadata: (data as Record<string, unknown>)
              .metadata as unknown as ReelMetadata,
            transcript: data.transcript as string,
            summary: data.summary as string,
            keyLists: data.key_lists as KeyList[],
          });
          break;
        case "error":
          updateJob(jobId, {
            status: "error",
            error: data.detail as string,
            step: null,
          });
          break;
        case "done":
          setJobs((prev) =>
            prev.map((j) =>
              j.id === jobId
                ? { ...j, status: j.status === "cached" ? "cached" as const : "done" as const, step: null }
                : j
            )
          );
          break;
      }
    },
    [updateJob]
  );

  const handleAnalyze = useCallback(
    (url: string) => {
      const id = `job-${++jobCounter}-${Date.now()}`;
      const newJob: Job = {
        id,
        url,
        status: "processing",
        step: { step: 0, label: "Starting..." },
        videoId: null,
        metadata: null,
        transcript: null,
        summary: null,
        keyLists: [],
        error: null,
        startedAt: Date.now(),
      };

      setJobs((prev) => [newJob, ...prev]);
      setExpandedJobId(id);
      processJob(newJob);
    },
    [processJob]
  );

  const toggleJob = useCallback((jobId: string) => {
    setExpandedJobId((prev) => (prev === jobId ? null : jobId));
  }, []);

  // Login modal
  if (showLogin) {
    return (
      <LoginGate
        onLogin={handleLogin}
        onSkip={() => setShowLogin(false)}
      />
    );
  }

  const activeJobs = jobs.filter(
    (j) => j.status === "processing" || j.status === "queued"
  );

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
        <div className="header__right">
          {activeJobs.length > 0 && (
            <div className="header__active-badge">
              <span className="spinner spinner--small" />
              {activeJobs.length} processing
            </div>
          )}
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
        </div>
      </header>

      {/* URL Input — always available */}
      <UrlInput onSubmit={handleAnalyze} loading={false} />

      {/* Jobs List */}
      <main className="jobs-list">
        {jobs.length === 0 && (
          <div className="jobs-empty">
            <div className="jobs-empty__icon">🎬</div>
            <div className="jobs-empty__title">No reels analyzed yet</div>
            <div className="jobs-empty__desc">
              Paste an Instagram Reel URL above to get started. You can submit
              multiple URLs — they&apos;ll be processed in parallel.
            </div>
          </div>
        )}

        {jobs.map((job) => (
          <JobCard
            key={job.id}
            job={job}
            isExpanded={expandedJobId === job.id}
            onToggle={() => toggleJob(job.id)}
          />
        ))}
      </main>
    </div>
  );
}
