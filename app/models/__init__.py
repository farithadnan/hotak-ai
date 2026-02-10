"""Data models for the application."""

# Export template models for easier imports
from .template import (
    Template,
    TemplateCreate,
    TemplateUpdate,
    TemplateSettings
)

__all__ = [
    'Template',
    'TemplateCreate', 
    'TemplateUpdate',
    'TemplateSettings'
]
