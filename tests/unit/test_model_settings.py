"""Unit tests for app.services.model_settings."""

import json
from pathlib import Path
from unittest.mock import patch

import pytest


def _make_settings_file(tmp_path: Path, data: dict) -> Path:
    f = tmp_path / "model_settings.json"
    f.write_text(json.dumps(data), encoding="utf-8")
    return f


class TestInitializeModelSettings:
    def test_no_op_on_empty_accessible_list(self, tmp_path):
        settings_file = tmp_path / "model_settings.json"
        with patch("app.services.model_settings.SETTINGS_FILE", settings_file):
            from app.services.model_settings import initialize_model_settings
            initialize_model_settings([])
        assert not settings_file.exists()

    def test_first_run_enables_all_models(self, tmp_path):
        settings_file = tmp_path / "model_settings.json"
        with patch("app.services.model_settings.SETTINGS_FILE", settings_file):
            from app.services.model_settings import initialize_model_settings
            initialize_model_settings(["gpt-4o", "gpt-4o-mini"])
        data = json.loads(settings_file.read_text())
        assert set(data["enabled_models"]) == {"gpt-4o", "gpt-4o-mini"}
        assert data["default_model"] == "gpt-4o"

    def test_subsequent_run_merges_new_models(self, tmp_path):
        settings_file = _make_settings_file(tmp_path, {
            "enabled_models": ["gpt-4o"],
            "default_model": "gpt-4o",
        })
        with patch("app.services.model_settings.SETTINGS_FILE", settings_file):
            from app.services.model_settings import initialize_model_settings
            initialize_model_settings(["gpt-4o", "gpt-4o-mini", "ollama/llama3.2"])
        data = json.loads(settings_file.read_text())
        assert "gpt-4o-mini" in data["enabled_models"]
        assert "ollama/llama3.2" in data["enabled_models"]
        assert "gpt-4o" in data["enabled_models"]
        # default must not be overwritten
        assert data["default_model"] == "gpt-4o"

    def test_no_write_when_no_new_models(self, tmp_path):
        settings_file = _make_settings_file(tmp_path, {
            "enabled_models": ["gpt-4o"],
            "default_model": "gpt-4o",
        })
        mtime_before = settings_file.stat().st_mtime
        with patch("app.services.model_settings.SETTINGS_FILE", settings_file):
            from app.services.model_settings import initialize_model_settings
            initialize_model_settings(["gpt-4o"])
        # file should not be re-written (mtime unchanged or same content)
        data = json.loads(settings_file.read_text())
        assert data["enabled_models"] == ["gpt-4o"]


class TestGetAndUpdateModelSettings:
    def test_get_enabled_returns_list(self, tmp_path):
        settings_file = _make_settings_file(tmp_path, {
            "enabled_models": ["gpt-4o", "gpt-4o-mini"],
            "default_model": "gpt-4o",
        })
        with patch("app.services.model_settings.SETTINGS_FILE", settings_file):
            from app.services.model_settings import get_enabled_models
            result = get_enabled_models()
        assert result == ["gpt-4o", "gpt-4o-mini"]

    def test_get_enabled_returns_empty_when_no_file(self, tmp_path):
        missing_file = tmp_path / "missing.json"
        with patch("app.services.model_settings.SETTINGS_FILE", missing_file):
            from app.services.model_settings import get_enabled_models
            result = get_enabled_models()
        assert result == []

    def test_update_model_settings_persists(self, tmp_path):
        settings_file = tmp_path / "model_settings.json"
        with patch("app.services.model_settings.SETTINGS_FILE", settings_file):
            from app.services.model_settings import update_model_settings, get_enabled_models
            update_model_settings(["gpt-4o-mini"], "gpt-4o-mini")
            assert get_enabled_models() == ["gpt-4o-mini"]

    def test_get_default_model(self, tmp_path):
        settings_file = _make_settings_file(tmp_path, {
            "enabled_models": ["gpt-4o"],
            "default_model": "gpt-4o",
        })
        with patch("app.services.model_settings.SETTINGS_FILE", settings_file):
            from app.services.model_settings import get_default_model
            assert get_default_model() == "gpt-4o"

    def test_get_default_model_missing_file(self, tmp_path):
        missing = tmp_path / "nope.json"
        with patch("app.services.model_settings.SETTINGS_FILE", missing):
            from app.services.model_settings import get_default_model
            assert get_default_model() is None
