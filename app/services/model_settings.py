"""Admin-controlled model settings — which models are enabled and what the default is."""

import json
from pathlib import Path
from typing import Optional

from app.config.settings import DATA_DIRECTORY
from app.utils.logger import setup_logger

logger = setup_logger(__name__)

SETTINGS_FILE = DATA_DIRECTORY / "model_settings.json"


def _load() -> dict:
    if not SETTINGS_FILE.exists():
        return {"enabled_models": [], "default_model": None}
    try:
        return json.loads(SETTINGS_FILE.read_text(encoding="utf-8"))
    except Exception as e:
        logger.error(f"Failed to load model settings: {e}")
        return {"enabled_models": [], "default_model": None}


def _save(data: dict) -> None:
    SETTINGS_FILE.parent.mkdir(parents=True, exist_ok=True)
    SETTINGS_FILE.write_text(json.dumps(data, indent=2), encoding="utf-8")


def get_enabled_models() -> list[str]:
    return _load().get("enabled_models", [])


def get_default_model() -> Optional[str]:
    return _load().get("default_model")


def update_model_settings(enabled_models: list[str], default_model: Optional[str]) -> dict:
    data = {"enabled_models": enabled_models, "default_model": default_model}
    _save(data)
    logger.info(f"Model settings updated: {len(enabled_models)} enabled, default={default_model}")
    return data


def initialize_model_settings(accessible_models: list[str]) -> None:
    """Called at startup — if no settings exist yet, enable all accessible models."""
    if not SETTINGS_FILE.exists() and accessible_models:
        default = accessible_models[0] if accessible_models else None
        _save({"enabled_models": accessible_models, "default_model": default})
        logger.info("Model settings initialised with all accessible models.")
