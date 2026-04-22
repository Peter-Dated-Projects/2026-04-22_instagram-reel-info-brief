"""Pydantic models for request/response schemas."""

from pydantic import BaseModel


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    success: bool
    message: str
    username: str | None = None


class AnalyzeRequest(BaseModel):
    url: str


class ReelMetadata(BaseModel):
    username: str
    description: str
    title: str
    thumbnail_url: str | None = None
    like_count: int | None = None
    view_count: int | None = None
    comment_count: int | None = None


class AnalyzeResponse(BaseModel):
    video_id: str
    metadata: ReelMetadata
    transcript: str
    summary: str
    key_lists: list[dict]
