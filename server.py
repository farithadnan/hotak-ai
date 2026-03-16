"""Compatibility ASGI entrypoint.

Allows running either:
- uvicorn server:app --reload
- uvicorn app.server:app --reload
"""

from app.server import app
