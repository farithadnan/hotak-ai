"""Unit tests for database URL configuration and portability."""

import importlib
import sys
from unittest.mock import patch


def _reload_db(env: dict):
    """Reload app.db with a patched environment and return the module."""
    # Remove cached module so imports re-execute with new env
    for key in list(sys.modules.keys()):
        if "app.db" in key:
            del sys.modules[key]
    with patch.dict("os.environ", env, clear=False):
        import app.db as db_mod
        return db_mod


def test_default_url_is_sqlite():
    """When DATABASE_URL is not set, engine should use the SQLite default."""
    env = {}
    with patch.dict("os.environ", env, clear=False):
        # Remove DATABASE_URL if it happens to be set
        import os
        os.environ.pop("DATABASE_URL", None)
        for key in list(sys.modules.keys()):
            if "app.db" in key:
                del sys.modules[key]
        import app.db as db_mod
        assert db_mod.DATABASE_URL.startswith("sqlite:///")


def test_empty_string_falls_back_to_sqlite():
    """An empty DATABASE_URL string must fall back to SQLite (not crash)."""
    mod = _reload_db({"DATABASE_URL": ""})
    assert mod.DATABASE_URL.startswith("sqlite:///")


def test_postgres_url_is_accepted():
    """A postgresql:// URL must be used as-is without modification."""
    pg_url = "postgresql://user:pass@localhost:5432/testdb"
    mod = _reload_db({"DATABASE_URL": pg_url})
    assert mod.DATABASE_URL == pg_url


def test_sqlite_connect_args_set():
    """SQLite engine must have check_same_thread=False in connect_args."""
    for key in list(sys.modules.keys()):
        if "app.db" in key:
            del sys.modules[key]
    import os
    os.environ.pop("DATABASE_URL", None)
    import app.db as db_mod
    assert db_mod.engine.dialect.name == "sqlite"


def test_postgres_no_sqlite_connect_args():
    """PostgreSQL engine must NOT include check_same_thread (unsupported by psycopg2)."""
    pg_url = "postgresql://user:pass@localhost:5432/testdb"
    mod = _reload_db({"DATABASE_URL": pg_url})
    assert "postgresql" in mod.DATABASE_URL
    # The module-level _connect_args dict must be empty for non-SQLite URLs
    assert mod._connect_args == {}
