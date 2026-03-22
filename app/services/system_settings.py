"""Admin-controlled system settings — tunable magic numbers."""

import json
from app.config.settings import DATA_DIRECTORY
from app.utils.logger import setup_logger

logger = setup_logger(__name__)

SYSTEM_SETTINGS_FILE = DATA_DIRECTORY / "system_settings.json"

DEFAULTS: dict = {
    "llm_temperature": 0.2,
    "llm_max_tokens": 4096,
    "stream_max_chars": 32000,
    "chat_history_max_tokens": 2800,
    "chat_history_max_message_tokens": 700,
    "chat_history_max_messages": 10,
    "chunk_size": 1000,
    "chunk_overlap": 200,
    "retrieval_k": 5,
    "summary_max_tokens": 200,
    "enable_summary_memory": True,
    "max_upload_file_size_mb": 10,
    "access_token_expire_minutes": 10080,
}


def _load() -> dict:
    if not SYSTEM_SETTINGS_FILE.exists():
        return dict(DEFAULTS)
    try:
        stored = json.loads(SYSTEM_SETTINGS_FILE.read_text(encoding="utf-8"))
        return {**DEFAULTS, **{k: v for k, v in stored.items() if k in DEFAULTS}}
    except Exception as e:
        logger.error(f"Failed to load system settings: {e}")
        return dict(DEFAULTS)


def _save(data: dict) -> None:
    SYSTEM_SETTINGS_FILE.parent.mkdir(parents=True, exist_ok=True)
    SYSTEM_SETTINGS_FILE.write_text(json.dumps(data, indent=2), encoding="utf-8")


def get_system_settings() -> dict:
    return _load()


def update_system_settings(updates: dict) -> dict:
    current = _load()
    current.update({k: v for k, v in updates.items() if k in DEFAULTS})
    _save(current)
    logger.info("System settings updated.")
    return current
