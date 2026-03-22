"""User database model and Pydantic schemas."""

import json
import uuid
from datetime import datetime
from typing import Literal

from sqlalchemy import Boolean, Column, DateTime, String, Text
from pydantic import BaseModel, Field, field_validator

from app.db import Base

# ---------------------------------------------------------------------------
# Default user preferences
# ---------------------------------------------------------------------------

DEFAULT_PREFERENCES: dict = {
    "theme": "dark",
    "accent": "indigo",
    "chat_background": "none",
    "default_model": None,
    "default_system_prompt": None,
    "avatar": None,
}


class UserDB(Base):
    """SQLAlchemy ORM model for the users table."""

    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False, default="user")       # "admin" | "user"
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    preferences = Column(Text, nullable=True, default=None)     # JSON string


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=6)
    role: Literal["admin", "user"] = "user"


class UserLogin(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    role: str
    is_active: bool
    created_at: datetime
    preferences: dict = Field(default_factory=lambda: DEFAULT_PREFERENCES.copy())

    model_config = {"from_attributes": True}

    @field_validator("preferences", mode="before")
    @classmethod
    def parse_preferences(cls, v: object) -> dict:
        if isinstance(v, dict):
            return {**DEFAULT_PREFERENCES, **v}
        if isinstance(v, str):
            try:
                parsed = json.loads(v)
                return {**DEFAULT_PREFERENCES, **parsed}
            except Exception:
                pass
        return DEFAULT_PREFERENCES.copy()


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class UpdateProfile(BaseModel):
    username: str | None = Field(None, min_length=3, max_length=50)
    email: str | None = Field(None, min_length=3, max_length=255)


class ChangePassword(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6)


class UpdatePreferences(BaseModel):
    theme: Literal["dark", "light"] | None = None
    accent: Literal["indigo", "emerald", "amber", "rose", "sky", "slate"] | None = None
    chat_background: Literal["none", "dots", "grid", "gradient-warm", "gradient-cool", "gradient-purple"] | None = None
    default_model: str | None = None
    default_system_prompt: str | None = None
    avatar: str | None = None  # base64-encoded image
