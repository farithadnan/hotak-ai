"""Unit tests for app.services.model_catalog."""

import pytest
from app.services.model_catalog import (
    is_chat_model,
    get_accessible_models_cache,
    _ollama_model_id,
)


# ---------------------------------------------------------------------------
# is_chat_model
# ---------------------------------------------------------------------------

class TestIsChatModel:
    def test_gpt4o_accepted(self):
        assert is_chat_model("gpt-4o") is True

    def test_gpt4o_mini_accepted(self):
        assert is_chat_model("gpt-4o-mini") is True

    def test_gpt35_turbo_accepted(self):
        assert is_chat_model("gpt-3.5-turbo") is True

    def test_o1_accepted(self):
        assert is_chat_model("o1") is True

    def test_o3_accepted(self):
        assert is_chat_model("o3-mini") is True

    def test_o4_accepted(self):
        assert is_chat_model("o4-mini") is True

    def test_chatgpt_model_accepted(self):
        assert is_chat_model("chatgpt-4o-latest") is True

    def test_embedding_rejected(self):
        assert is_chat_model("text-embedding-3-small") is False

    def test_tts_rejected(self):
        assert is_chat_model("tts-1") is False

    def test_whisper_rejected(self):
        assert is_chat_model("whisper-1") is False

    def test_moderation_rejected(self):
        assert is_chat_model("text-moderation-latest") is False

    def test_dalle_rejected(self):
        # "image" is in the excludes list
        assert is_chat_model("dall-e-3") is False

    def test_unknown_prefix_rejected(self):
        assert is_chat_model("llama3.2") is False

    def test_case_insensitive(self):
        assert is_chat_model("GPT-4O") is False  # prefix check is lowercase


# ---------------------------------------------------------------------------
# _ollama_model_id
# ---------------------------------------------------------------------------

class TestOllamaModelId:
    def test_strips_latest_suffix(self):
        assert _ollama_model_id("llama3.2:latest") == "ollama/llama3.2"

    def test_preserves_non_latest_tag(self):
        assert _ollama_model_id("llama3.2:8b") == "ollama/llama3.2:8b"

    def test_no_tag(self):
        assert _ollama_model_id("mistral") == "ollama/mistral"

    def test_codellama(self):
        assert _ollama_model_id("codellama:latest") == "ollama/codellama"

    def test_model_with_version(self):
        assert _ollama_model_id("phi3:3.8b") == "ollama/phi3:3.8b"


# ---------------------------------------------------------------------------
# get_accessible_models_cache
# ---------------------------------------------------------------------------

class TestGetAccessibleModelsCache:
    def test_returns_list(self):
        result = get_accessible_models_cache()
        assert isinstance(result, list)
