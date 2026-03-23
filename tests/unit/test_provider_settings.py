"""Unit tests for app.services.provider_settings."""

import json
from pathlib import Path
from unittest.mock import patch

import pytest


class TestMaskKey:
    def test_empty_string_returns_empty(self):
        from app.services.provider_settings import _mask_key
        assert _mask_key("") == ""

    def test_short_key_returns_dots(self):
        from app.services.provider_settings import _mask_key
        assert _mask_key("abc") == "••••••••"

    def test_exactly_eight_chars_returns_dots(self):
        from app.services.provider_settings import _mask_key
        assert _mask_key("12345678") == "••••••••"

    def test_long_key_shows_last_four(self):
        from app.services.provider_settings import _mask_key
        result = _mask_key("sk-abcdefghijklmnopXYZW")
        assert result.startswith("sk-...")
        assert result.endswith("XYZW")

    def test_exactly_nine_chars_shows_last_four(self):
        from app.services.provider_settings import _mask_key
        result = _mask_key("sk-abc123")
        assert result.endswith("c123")


class TestGetProviderSettings:
    def test_no_file_returns_env_key_source(self, tmp_path):
        missing = tmp_path / "provider_settings.json"
        with (
            patch("app.services.provider_settings.PROVIDERS_FILE", missing),
            patch("app.services.provider_settings.OPENAI_API_KEY", "sk-envkey1234"),
            patch("app.services.provider_settings.OLLAMA_BASE_URL", "http://localhost:11434"),
        ):
            from app.services.provider_settings import get_provider_settings
            result = get_provider_settings()
        assert result["openai_api_key_set"] is True
        assert result["openai_api_key_source"] == "env"
        assert "1234" in result["openai_api_key_preview"]

    def test_db_key_takes_precedence_over_env(self, tmp_path):
        pf = tmp_path / "provider_settings.json"
        pf.write_text(json.dumps({"openai_api_key": "sk-dbkey9999"}), encoding="utf-8")
        with (
            patch("app.services.provider_settings.PROVIDERS_FILE", pf),
            patch("app.services.provider_settings.OPENAI_API_KEY", "sk-envkey1234"),
            patch("app.services.provider_settings.OLLAMA_BASE_URL", "http://localhost:11434"),
        ):
            from app.services.provider_settings import get_provider_settings
            result = get_provider_settings()
        assert result["openai_api_key_source"] == "db"
        assert "9999" in result["openai_api_key_preview"]

    def test_no_key_at_all(self, tmp_path):
        missing = tmp_path / "provider_settings.json"
        with (
            patch("app.services.provider_settings.PROVIDERS_FILE", missing),
            patch("app.services.provider_settings.OPENAI_API_KEY", ""),
            patch("app.services.provider_settings.OLLAMA_BASE_URL", ""),
        ):
            from app.services.provider_settings import get_provider_settings
            result = get_provider_settings()
        assert result["openai_api_key_set"] is False
        assert result["openai_api_key_source"] == "none"


class TestUpdateProviderSettings:
    def test_saves_new_key(self, tmp_path):
        pf = tmp_path / "ps.json"
        with (
            patch("app.services.provider_settings.PROVIDERS_FILE", pf),
            patch("app.services.provider_settings.OPENAI_API_KEY", ""),
            patch("app.services.provider_settings.OLLAMA_BASE_URL", ""),
        ):
            from app.services.provider_settings import update_provider_settings
            update_provider_settings("sk-newkey5678", None)
        saved = json.loads(pf.read_text())
        assert saved["openai_api_key"] == "sk-newkey5678"

    def test_blank_key_removes_db_entry(self, tmp_path):
        pf = tmp_path / "ps.json"
        pf.write_text(json.dumps({"openai_api_key": "sk-old"}), encoding="utf-8")
        with (
            patch("app.services.provider_settings.PROVIDERS_FILE", pf),
            patch("app.services.provider_settings.OPENAI_API_KEY", ""),
            patch("app.services.provider_settings.OLLAMA_BASE_URL", ""),
        ):
            from app.services.provider_settings import update_provider_settings
            update_provider_settings("  ", None)  # blank/whitespace
        saved = json.loads(pf.read_text())
        assert "openai_api_key" not in saved

    def test_saves_ollama_url(self, tmp_path):
        pf = tmp_path / "ps.json"
        with (
            patch("app.services.provider_settings.PROVIDERS_FILE", pf),
            patch("app.services.provider_settings.OPENAI_API_KEY", ""),
            patch("app.services.provider_settings.OLLAMA_BASE_URL", ""),
        ):
            from app.services.provider_settings import update_provider_settings
            update_provider_settings(None, "http://myollama:11434")
        saved = json.loads(pf.read_text())
        assert saved["ollama_base_url"] == "http://myollama:11434"
