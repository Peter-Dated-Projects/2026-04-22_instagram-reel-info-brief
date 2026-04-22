"use client";

import type { Job } from "../page";
import VideoPanel from "./VideoPanel";
import InfoPanel from "./InfoPanel";
import InsightsPanel from "./InsightsPanel";

interface JobCardProps {
  job: Job;
  isExpanded: boolean;
  onToggle: () => void;
}

function StatusBadge({ status }: { status: Job["status"] }) {
  const config = {
    queued: { label: "Queued", className: "badge--queued" },
    processing: { label: "Processing", className: "badge--processing" },
    done: { label: "Done", className: "badge--done" },
    cached: { label: "Cached", className: "badge--cached" },
    error: { label: "Error", className: "badge--error" },
  };
  const { label, className } = config[status];
  return <span className={`badge ${className}`}>{label}</span>;
}

function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ago`;
}

export default function JobCard({ job, isExpanded, onToggle }: JobCardProps) {
  const isActive = job.status === "processing" || job.status === "queued";
  const displayName =
    job.metadata?.username || new URL(job.url).pathname.split("/").pop() || "Reel";

  return (
    <div className={`job-card ${isExpanded ? "job-card--expanded" : ""} ${isActive ? "job-card--active" : ""}`}>
      {/* Collapsed Header — always visible */}
      <button className="job-card__header" onClick={onToggle}>
        <div className="job-card__header-left">
          {isActive && <span className="spinner spinner--small" />}
          <div className="job-card__info">
            <span className="job-card__name">{displayName}</span>
            {job.step && (
              <span className="job-card__step">
                Step {job.step.step}/4 — {job.step.label}
              </span>
            )}
            {!job.step && job.metadata?.title && (
              <span className="job-card__step">{job.metadata.title}</span>
            )}
          </div>
        </div>
        <div className="job-card__header-right">
          <StatusBadge status={job.status} />
          <span className="job-card__time">
            {formatTime(Date.now() - job.startedAt)}
          </span>
          <span className={`job-card__chevron ${isExpanded ? "job-card__chevron--open" : ""}`}>
            ▾
          </span>
        </div>
      </button>

      {/* Error message (show even when collapsed) */}
      {job.error && !isExpanded && (
        <div className="job-card__error-bar">{job.error}</div>
      )}

      {/* Expanded Content — three-panel layout */}
      {isExpanded && (
        <div className="job-card__content">
          {job.error && (
            <div className="job-card__error-banner">{job.error}</div>
          )}
          <div className="job-card__panels">
            <VideoPanel
              videoId={job.videoId}
              loading={isActive && !job.videoId}
            />
            <InfoPanel
              metadata={job.metadata}
              transcript={job.transcript}
              loading={isActive && !job.metadata}
            />
            <InsightsPanel
              summary={job.summary}
              keyLists={job.keyLists}
              loading={isActive && !job.summary}
            />
          </div>
        </div>
      )}
    </div>
  );
}
