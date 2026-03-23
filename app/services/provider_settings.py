"""Admin-configurable provider settings — API keys and endpoints."""

import json
from typing import Optional

from app.config.settings import DATA_DIRECTORY, OPENAI_API_KEY, OLLAMA_BASE_URL
from app.utils.logger import setup_logger

logger = setup_logger(__name__)

PROVIDERS_FILE = DATA_DIRECTORY / "provider_settings.json"


def _load() -> dict:
    if not PROVIDERS_FILE.exists():
        return {}
    try:
        return json.loads(PROVIDERS_FILE.read_text(encoding="utf-8"))
    except Exception as e:
        logger.error("Failed to load provider settings: %s", e)
        return {}


def _save(data: dict) -> None:
    PROVIDERS_FILE.parent.mkdir(parents=True, exist_ok=True)
    PROVIDERS_FILE.write_text(json.dumps(data, indent=2), encoding="utf-8")


def get_effective_openai_key() -> str:
    """DB-stored key takes precedence over env var."""
    return _load().get("openai_api_key") or OPENAI_API_KEY


def get_effective_ollama_url() -> str:
    """DB-stored URL takes precedence over env var."""
    return _load().get("ollama_base_url") or OLLAMA_BASE_URL


def _mask_key(key: str) -> str:
    if not key:
        return ""
    if len(key) > 8:
        return f"sk-...{key[-4:]}"
    return "••••••••"


def get_provider_settings() -> dict:
    data = _load()
    raw_key = data.get("openai_api_key", "")
    effective_key = raw_key or OPENAI_API_KEY
    return {
        "openai_api_key_preview": _mask_key(effective_key),
        "openai_api_key_set": bool(effective_key),
        "openai_api_key_source": "db" if raw_key else ("env" if OPENAI_API_KEY else "none"),
        "ollama_base_url": data.get("ollama_base_url", "") or OLLAMA_BASE_URL,
        "ollama_base_url_source": "db" if data.get("ollama_base_url") else "env",
    }


def update_provider_settings(
    openai_api_key: Optional[str],
    ollama_base_url: Optional[str],
) -> dict:
    data = _load()
    if openai_api_key is not None:
        stripped = openai_api_key.strip()
        if stripped:
            data["openai_api_key"] = stripped
        else:
            data.pop("openai_api_key", None)
    if ollama_base_url is not None:
        stripped = ollama_base_url.strip()
        if stripped:
            data["ollama_base_url"] = stripped
        else:
            data.pop("ollama_base_url", None)
    _save(data)
    logger.info("Provider settings updated.")
    return get_provider_settings()
