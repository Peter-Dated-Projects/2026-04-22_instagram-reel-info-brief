"use client";

import { useState } from "react";

interface UrlInputProps {
  onSubmit: (url: string) => void;
  loading: boolean;
}

export default function UrlInput({ onSubmit, loading }: UrlInputProps) {
  const [url, setUrl] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  };

  const isValid =
    url.trim().length > 0 && url.includes("instagram.com");

  return (
    <div className="url-input-bar">
      <form className="url-input-bar__inner" onSubmit={handleSubmit}>
        <input
          id="reel-url-input"
          className="url-input-bar__field"
          type="url"
          placeholder="Paste an Instagram Reel URL — e.g. https://www.instagram.com/reel/ABC123/"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={loading}
        />
        <button
          type="submit"
          className="btn btn--primary"
          disabled={loading || !isValid}
        >
          {loading ? (
            <>
              <span className="spinner" />
              Analyzing...
            </>
          ) : (
            <>🔍 Analyze</>
          )}
        </button>
      </form>
    </div>
  );
}
