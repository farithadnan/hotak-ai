"""
Template data models for knowledge management.

A Template is a reusable "brain" that contains:
- Documents/sources to search
- Custom settings (model, temperature, prompt, etc.)
- Metadata (name, description, timestamps)
"""

from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
import uuid


class TemplateSettings(BaseModel):
    """Configuration settings for a template."""
    
    model: str = Field(default="gpt-4o-mini", description="LLM model to use")
    temperature: float = Field(default=0.2, ge=0.0, le=1.0, description="Model temperature")
    chunk_size: int = Field(default=1000, gt=0, description="Text chunk size")
    chunk_overlap: int = Field(default=200, ge=0, description="Chunk overlap")
    retrieval_k: int = Field(default=5, gt=0, description="Number of docs to retrieve")
    system_prompt: str = Field(
        default="You are a helpful AI assistant. Answer based on the provided context.",
        description="Custom system prompt for this template"
    )


class TemplateCreate(BaseModel):
    """Data required to create a new template."""
    
    name: str = Field(..., min_length=1, max_length=100, description="Template name")
    description: str = Field(default="", max_length=500, description="Template description")
    sources: List[str] = Field(default_factory=list, description="List of URLs or file paths")
    settings: TemplateSettings = Field(default_factory=TemplateSettings)


class Template(BaseModel):
    """Complete template model with metadata."""
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    sources: List[str]
    settings: TemplateSettings
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: Optional[str] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "name": "Python Documentation Helper",
                "description": "Answers questions about Python standard library",
                "sources": [
                    "https://docs.python.org/3/library/",
                    "https://peps.python.org/"
                ],
                "settings": {
                    "model": "gpt-4o-mini",
                    "temperature": 0.2,
                    "chunk_size": 1000,
                    "chunk_overlap": 200,
                    "retrieval_k": 5,
                    "system_prompt": "You are a Python expert. Answer questions using the official Python documentation."
                },
                "created_at": "2026-02-05T10:30:00",
                "updated_at": None
            }
        }


class TemplateUpdate(BaseModel):
    """Data for updating an existing template."""
    
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    sources: Optional[List[str]] = None
    settings: Optional[TemplateSettings] = None
