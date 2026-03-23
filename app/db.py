"""SQLAlchemy database setup (SQLite) for user persistence."""

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.config.settings import DATA_DIRECTORY

DATABASE_URL = f"sqlite:///{DATA_DIRECTORY / 'app.db'}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
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
    """Apply incremental schema changes that create_all won't handle on existing tables."""
    with engine.connect() as conn:
        # Phase 7.2: add role + is_active columns to users table if missing
        existing = {row[1] for row in conn.execute(
            __import__("sqlalchemy").text("PRAGMA table_info(users)")
        )}
        if "role" not in existing:
            conn.execute(__import__("sqlalchemy").text(
                "ALTER TABLE users ADD COLUMN role VARCHAR NOT NULL DEFAULT 'user'"
            ))
        if "is_active" not in existing:
            conn.execute(__import__("sqlalchemy").text(
                "ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT 1"
            ))
        # Phase 7.4: add preferences JSON column
        if "preferences" not in existing:
            conn.execute(__import__("sqlalchemy").text(
                "ALTER TABLE users ADD COLUMN preferences TEXT"
            ))
        # Phase 7.7: add last_login_at column
        if "last_login_at" not in existing:
            conn.execute(__import__("sqlalchemy").text(
                "ALTER TABLE users ADD COLUMN last_login_at DATETIME"
            ))
        conn.commit()
