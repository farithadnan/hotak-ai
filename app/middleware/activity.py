"""Middleware that logs every API request to the activity_logs table."""

import time
import uuid

from jose import JWTError, jwt
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.db import SessionLocal
from app.models.activity_log import ActivityLogDB

# Paths that generate too much noise to be worth logging
_SKIP_PATHS = frozenset({"/health", "/docs", "/redoc", "/openapi.json"})


class ActivityLogMiddleware(BaseHTTPMiddleware):
    """
    Records each request as an ActivityLogDB row.

    - Adds X-Request-ID response header.
    - Decodes the Bearer JWT (if present) to store user_id / username.
    - Never raises — logging failures are silently swallowed so the real
      request is never impacted.
    """

    def __init__(self, app, jwt_secret: str, jwt_algorithm: str = "HS256"):
        super().__init__(app)
        self._secret = jwt_secret
        self._algorithm = jwt_algorithm

    async def dispatch(self, request: Request, call_next) -> Response:
        if request.url.path in _SKIP_PATHS:
            return await call_next(request)

        request_id = str(uuid.uuid4())[:8]
        request.state.request_id = request_id

        start = time.monotonic()
        response = await call_next(request)
        latency_ms = int((time.monotonic() - start) * 1000)

        response.headers["X-Request-ID"] = request_id

        # Extract user identity from JWT token (best-effort, never fails request)
        user_id: str | None = None
        username: str | None = None
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            try:
                payload = jwt.decode(
                    auth[7:], self._secret, algorithms=[self._algorithm]
                )
                user_id = payload.get("sub")
            except JWTError:
                pass

        if user_id:
            db = SessionLocal()
            try:
                from app.models.user import UserDB  # local import avoids circular dep
                row = db.query(UserDB).filter(UserDB.id == user_id).first()
                if row:
                    username = row.username
            except Exception:
                pass
            finally:
                db.close()

        # Persist the log entry
        db = SessionLocal()
        try:
            entry = ActivityLogDB(
                user_id=user_id,
                username=username,
                method=request.method,
                path=request.url.path,
                status_code=response.status_code,
                latency_ms=latency_ms,
                request_id=request_id,
            )
            db.add(entry)
            db.commit()
        except Exception:
            pass  # never fail the caller due to a logging error
        finally:
            db.close()

        return response
