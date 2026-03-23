"""
Shared pytest fixtures.

Patching strategy
-----------------
settings.DATA_DIRECTORY is a compile-time Path derived from __file__, not an
env var, so we cannot override it via os.environ.  Instead:

* Unit tests patch the specific file-level variable used by the code under
  test (e.g. ``app.services.model_settings.SETTINGS_FILE``).

* Integration tests override FastAPI's ``get_db`` dependency with an
  in-memory SQLite session and set ``app.state`` to lightweight mocks so no
  real OpenAI key, ChromaDB directory, or Ollama server is needed.
"""

import os
# Must be set before any app module is imported.
os.environ.setdefault("OPENAI_API_KEY", "sk-test-fake-key-for-testing")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-pytest")
os.environ.setdefault("ANONYMIZED_TELEMETRY", "False")
os.environ.setdefault("LANGSMITH_TRACING", "false")

from unittest.mock import MagicMock  # noqa: E402

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402


# ---------------------------------------------------------------------------
# In-memory database — shared across the whole session
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session")
def test_engine():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
    )
    from app.db import Base
    Base.metadata.create_all(bind=engine)
    # Run migration so role/is_active/preferences columns exist.
    from app.db import _migrate
    with engine.begin():
        pass  # _migrate uses its own connection
    return engine


@pytest.fixture()
def db_session(test_engine):
    Session = sessionmaker(bind=test_engine)
    session = Session()
    yield session
    session.rollback()
    session.close()


# ---------------------------------------------------------------------------
# FastAPI test app
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session")
def _base_app():
    """
    Return the FastAPI application with its startup handler disabled.
    We set ``app.state`` manually so tests never touch real external services.
    """
    from app.server import app as _app

    # Prevent the real startup (OpenAI probe, ChromaDB init, etc.) from running.
    _app.router.on_startup.clear()

    # Minimal app.state — endpoints that touch these will work without real services.
    mock_vs = MagicMock()
    mock_vs.get.return_value = {"ids": [], "documents": [], "metadatas": []}
    _app.state.vector_store = mock_vs
    _app.state.accessible_models = [
        {"id": "gpt-4o-mini", "object": "model", "owned_by": "openai", "created": 0},
        {"id": "gpt-4o",      "object": "model", "owned_by": "openai", "created": 0},
    ]

    return _app


@pytest.fixture()
def client(_base_app, test_engine):
    """
    TestClient with:
    - ``get_db`` overridden to use the in-memory SQLite engine.
    - A pre-created admin + regular user for auth tests.
    """
    from app.db import get_db
    from app.models.user import UserDB
    from app.services.auth import hash_password

    Session = sessionmaker(bind=test_engine)

    def override_get_db():
        db = Session()
        try:
            yield db
        finally:
            db.close()

    _base_app.dependency_overrides[get_db] = override_get_db

    # Seed users once (idempotent).
    db = Session()
    if not db.query(UserDB).filter_by(username="testadmin").first():
        db.add(UserDB(
            username="testadmin",
            email="admin@test.local",
            hashed_password=hash_password("Adminpass1!"),
            role="admin",
            is_active=True,
        ))
    if not db.query(UserDB).filter_by(username="testuser").first():
        db.add(UserDB(
            username="testuser",
            email="user@test.local",
            hashed_password=hash_password("Userpass1!"),
            role="user",
            is_active=True,
        ))
    db.commit()
    db.close()

    with TestClient(_base_app, raise_server_exceptions=True) as c:
        yield c

    _base_app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Convenience auth fixtures
# ---------------------------------------------------------------------------

@pytest.fixture()
def admin_token(client):
    resp = client.post("/auth/login", json={"username": "testadmin", "password": "Adminpass1!"})
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


@pytest.fixture()
def user_token(client):
    resp = client.post("/auth/login", json={"username": "testuser", "password": "Userpass1!"})
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


@pytest.fixture()
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture()
def user_headers(user_token):
    return {"Authorization": f"Bearer {user_token}"}
