"""SQLAlchemy database setup.

Supports SQLite (default / development) and PostgreSQL (production).
Set the DATABASE_URL environment variable to switch:

  SQLite (default):   sqlite:///./app/data/app.db
  PostgreSQL:         postgresql://user:password@host:5432/dbname
"""

import os
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker

from app.config.settings import DATA_DIRECTORY

_DEFAULT_DB = f"sqlite:///{DATA_DIRECTORY / 'app.db'}"
DATABASE_URL: str = os.getenv("DATABASE_URL", "").strip() or _DEFAULT_DB

# SQLite requires check_same_thread=False; PostgreSQL does not accept it
_connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=_connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI dependency that yields a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    """Create all tables defined via Base subclasses, then run any needed migrations."""
    Base.metadata.create_all(bind=engine)
    _migrate()


def _migrate():
    """Apply incremental schema changes using portable SQLAlchemy inspect()."""
    inspector = inspect(engine)

    # If the users table doesn't exist yet create_all already handled it — skip.
    if "users" not in inspector.get_table_names():
        return

    existing = {col["name"] for col in inspector.get_columns("users")}

    with engine.connect() as conn:
        # Phase 7.2: role + is_active
        if "role" not in existing:
            conn.execute(text(
                "ALTER TABLE users ADD COLUMN role VARCHAR NOT NULL DEFAULT 'user'"
            ))
        if "is_active" not in existing:
            conn.execute(text(
                "ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE"
            ))
        # Phase 7.4: user preferences (JSON stored as TEXT)
        if "preferences" not in existing:
            conn.execute(text(
                "ALTER TABLE users ADD COLUMN preferences TEXT"
            ))
        # Phase 7.7: last login timestamp
        if "last_login_at" not in existing:
            conn.execute(text(
                "ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP"
            ))

        # activity_logs table — created by create_all from the model, but guard here too
        if "activity_logs" not in inspector.get_table_names():
            pass  # create_all handles new tables; nothing to ALTER

        conn.commit()
