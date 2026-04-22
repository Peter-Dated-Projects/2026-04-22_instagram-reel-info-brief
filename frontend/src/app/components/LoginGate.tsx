"use client";

import { useState } from "react";

interface LoginGateProps {
  onLogin: (username: string) => void;
  onSkip?: () => void;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function LoginGate({ onLogin, onSkip }: LoginGateProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await res.json();

      if (data.success) {
        onLogin(data.username);
      } else {
        setError(data.message || "Login failed. Please try again.");
      }
    } catch {
      setError("Unable to connect to the server. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-gate">
      <div className="login-card">
        <div className="login-card__icon">📷</div>
        <h1 className="login-card__title">Reel Brief</h1>
        <p className="login-card__desc">
          Sign in to access private reels. Public reels work without login.
        </p>

        <form className="login-card__form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-group__label" htmlFor="login-username">
              Username
            </label>
            <input
              id="login-username"
              className="input-group__field"
              type="text"
              placeholder="your_instagram_handle"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              disabled={loading}
            />
          </div>

          <div className="input-group">
            <label className="input-group__label" htmlFor="login-password">
              Password
            </label>
            <input
              id="login-password"
              className="input-group__field"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={loading}
            />
          </div>

          {error && (
            <div
              style={{
                color: "var(--color-error)",
                fontSize: "13px",
                textAlign: "left",
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn--instagram btn--large btn--full"
            disabled={loading || !username.trim() || !password.trim()}
          >
            {loading ? (
              <>
                <span className="spinner" />
                Signing in...
              </>
            ) : (
              "Sign in with Instagram"
            )}
          </button>
        </form>

        {onSkip && (
          <button
            className="btn btn--ghost"
            onClick={onSkip}
            style={{ marginTop: "16px", width: "100%" }}
          >
            ← Back to app
          </button>
        )}
      </div>
    </div>
  );
}
