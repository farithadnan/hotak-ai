"""Activity log ORM model and Pydantic schemas."""

import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String
from pydantic import BaseModel

from app.db import Base


class ActivityLogDB(Base):
    """SQLAlchemy ORM model for per-request activity logs."""

    __tablename__ = "activity_logs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=True, index=True)   # None for unauthenticated requests
    username = Column(String, nullable=True)               # denormalised for quick display
    method = Column(String, nullable=False)
    path = Column(String, nullable=False)
    status_code = Column(Integer, nullable=False)
    latency_ms = Column(Integer, nullable=False)
    request_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class ActivityLogResponse(BaseModel):
    id: str
    user_id: str | None
    username: str | None
    method: str
    path: str
    status_code: int
    latency_ms: int
    request_id: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
