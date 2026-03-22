"""
Chat and Message data models.

A Chat represents a conversation session.
A Message represents a single entry in a Chat.
"""

from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
import uuid


class MessageAttachment(BaseModel):
    """Attachment metadata stored on user messages."""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    kind: str = Field(..., pattern="^(url|file)$", description="Attachment type")
    label: str = Field(..., description="Display label for the attachment")
    source: str = Field(..., description="Canonical source passed to document ingestion")
    status: str = Field(default="ingested", pattern="^(pending|ingested|failed)$")
    error: Optional[str] = Field(default=None, description="Optional failure reason")


class Message(BaseModel):
    """Individual message in a chat session."""
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    role: str = Field(..., pattern="^(user|assistant|system)$", description="Role of the message sender")
    content: str = Field(..., description="The message text")
    model: Optional[str] = Field(None, description="Model used to generate this message (assistant only)")
    sources: Optional[List[str]] = Field(default=None, description="Cited sources for assistant messages")
    attachments: Optional[List[MessageAttachment]] = Field(
        default=None,
        description="Attachments associated with user messages",
    )
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class ChatCreate(BaseModel):
    """Data required to start a new chat."""
    
    title: str = Field(default="New Chat", max_length=100)
    template_id: Optional[str] = Field(None, description="Optional template ID to bind this chat to")
    pinned: bool = Field(default=False, description="Whether chat is pinned in the sidebar")
    model: Optional[str] = Field(None, description="Preferred model for this chat")


class Chat(BaseModel):
    """Complete chat session model."""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: Optional[str] = Field(default=None, description="Owner user ID")
    title: str
    template_id: Optional[str] = None
    pinned: bool = False
    archived: bool = False
    model: Optional[str] = None
    messages: List[Message] = Field(default_factory=list)
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: Optional[str] = None


class ChatUpdate(BaseModel):
    """Data for updating a chat session (e.g., renaming)."""

    title: Optional[str] = Field(None, max_length=100)
    template_id: Optional[str] = None
    pinned: Optional[bool] = None
    archived: Optional[bool] = None
    model: Optional[str] = None
    messages: Optional[List[Message]] = None
