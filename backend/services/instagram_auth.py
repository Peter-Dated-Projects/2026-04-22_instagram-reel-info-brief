"""Instagram authentication service using instaloader.

Handles login, session persistence, and cookie export for yt-dlp.
"""

import os
import logging
import http.cookiejar
from pathlib import Path

import instaloader

logger = logging.getLogger(__name__)

SESSIONS_DIR = Path("./sessions")
SESSIONS_DIR.mkdir(exist_ok=True)


class InstagramAuth:
    """Manages Instagram authentication sessions."""

    def __init__(self):
        self._loader = instaloader.Instaloader()
        self._current_user: str | None = None

    @property
    def is_authenticated(self) -> bool:
        return self._current_user is not None

    @property
    def current_user(self) -> str | None:
        return self._current_user

    def login(self, username: str, password: str) -> tuple[bool, str]:
        """Authenticate with Instagram and save session.

        Returns (success, message) tuple.
        """
        try:
            self._loader.login(username, password)
            self._current_user = username

            # Save session for reuse
            session_file = SESSIONS_DIR / f"{username}.session"
            self._loader.save_session_to_file(str(session_file))

            # Export cookies to Netscape format for yt-dlp
            self._export_cookies(username)

            logger.info(f"Successfully logged in as {username}")
            return True, "Login successful"

        except instaloader.exceptions.BadCredentialsException:
            logger.warning(f"Bad credentials for {username}")
            return False, "Invalid username or password"
        except instaloader.exceptions.TwoFactorAuthRequiredException:
            logger.warning(f"2FA required for {username}")
            return False, "Two-factor authentication is required. Please disable it temporarily or use an app password."
        except instaloader.exceptions.ConnectionException as e:
            logger.error(f"Connection error during login: {e}")
            return False, f"Connection error: {str(e)}"
        except Exception as e:
            logger.error(f"Login failed: {e}")
            return False, f"Login failed: {str(e)}"

    def try_load_session(self, username: str) -> bool:
        """Try to load an existing session from disk."""
        session_file = SESSIONS_DIR / f"{username}.session"
        if not session_file.exists():
            return False

        try:
            self._loader.load_session_from_file(username, str(session_file))
            self._current_user = username
            logger.info(f"Loaded existing session for {username}")
            return True
        except Exception as e:
            logger.warning(f"Failed to load session for {username}: {e}")
            return False

    def _export_cookies(self, username: str):
        """Export session cookies to Netscape cookie jar format for yt-dlp."""
        cookie_jar_path = self.get_cookie_jar_path(username)

        # Get cookies from the instaloader session
        session = self._loader.context._session
        cj = http.cookiejar.MozillaCookieJar(str(cookie_jar_path))

        for cookie in session.cookies:
            cj.set_cookie(cookie)

        cj.save(ignore_discard=True, ignore_expires=True)
        logger.info(f"Exported cookies to {cookie_jar_path}")

    def get_cookie_jar_path(self, username: str | None = None) -> Path:
        """Get the cookie jar file path for a given user."""
        user = username or self._current_user
        if not user:
            raise ValueError("No user specified and no active session")
        return SESSIONS_DIR / f"{user}_cookies.txt"


# Singleton instance
auth_service = InstagramAuth()
