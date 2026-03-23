"""
Unit tests for the pure utility functions in app.api.query:

  _estimate_text_tokens
  _estimate_message_tokens
  _truncate_content_to_token_budget
  _resolve_history_budget
  _extract_retry_after_seconds
  _build_rate_limit_message
  _get_messages_for_llm
"""

import pytest
from app.api.query import (
    _estimate_text_tokens,
    _estimate_message_tokens,
    _truncate_content_to_token_budget,
    _resolve_history_budget,
    _extract_retry_after_seconds,
    _build_rate_limit_message,
    _get_messages_for_llm,
    QueryMessage,
)


# ---------------------------------------------------------------------------
# _estimate_text_tokens
# ---------------------------------------------------------------------------

class TestEstimateTextTokens:
    def test_empty_string_returns_zero(self):
        assert _estimate_text_tokens("") == 0

    def test_whitespace_only_returns_zero(self):
        assert _estimate_text_tokens("   ") == 0

    def test_four_chars_roughly_one_token(self):
        # formula: max(1, (len+3)//4)
        assert _estimate_text_tokens("abcd") == 1

    def test_eight_chars_roughly_two_tokens(self):
        assert _estimate_text_tokens("abcdefgh") == 2

    def test_hundred_chars_roughly_25_tokens(self):
        text = "a" * 100
        assert _estimate_text_tokens(text) == 25

    def test_result_at_least_one_for_non_empty(self):
        assert _estimate_text_tokens("x") >= 1


# ---------------------------------------------------------------------------
# _estimate_message_tokens
# ---------------------------------------------------------------------------

class TestEstimateMessageTokens:
    def test_overhead_is_at_least_six(self):
        tokens = _estimate_message_tokens("user", "hi")
        # overhead=6 + role≈1 + content≈1
        assert tokens >= 6

    def test_longer_content_gives_more_tokens(self):
        short = _estimate_message_tokens("user", "hi")
        long  = _estimate_message_tokens("user", "hi " * 100)
        assert long > short


# ---------------------------------------------------------------------------
# _truncate_content_to_token_budget
# ---------------------------------------------------------------------------

class TestTruncateContentToTokenBudget:
    def test_empty_string_returns_empty(self):
        assert _truncate_content_to_token_budget("", 100) == ""

    def test_zero_budget_returns_empty(self):
        assert _truncate_content_to_token_budget("hello world", 0) == ""

    def test_within_budget_returns_unchanged(self):
        text = "Short text"
        result = _truncate_content_to_token_budget(text, 1000)
        assert result == text

    def test_over_budget_truncates(self):
        long_text = "word " * 500
        result = _truncate_content_to_token_budget(long_text, 50)
        assert len(result) < len(long_text)

    def test_suffix_appended_when_truncated(self):
        long_text = "word " * 500
        suffix = "\n[truncated]"
        result = _truncate_content_to_token_budget(long_text, 50, suffix)
        assert result.endswith("[truncated]")

    def test_no_suffix_when_not_truncated(self):
        text = "Short"
        result = _truncate_content_to_token_budget(text, 1000, "\n[truncated]")
        assert result == text


# ---------------------------------------------------------------------------
# _resolve_history_budget
# ---------------------------------------------------------------------------

class TestResolveHistoryBudget:
    def test_returns_dict_with_expected_keys(self):
        budget = _resolve_history_budget("gpt-4o")
        assert "token_budget" in budget
        assert "per_message_budget" in budget
        assert "max_messages" in budget

    def test_mini_model_has_smaller_budget(self):
        default_budget = _resolve_history_budget("gpt-4o")
        mini_budget    = _resolve_history_budget("gpt-4o-mini")
        assert mini_budget["token_budget"] < default_budget["token_budget"]
        assert mini_budget["max_messages"] <= default_budget["max_messages"]

    def test_o1_model_has_larger_budget(self):
        default_budget = _resolve_history_budget("gpt-4o")
        o1_budget      = _resolve_history_budget("o1")
        assert o1_budget["token_budget"] > default_budget["token_budget"]

    def test_none_model_returns_defaults(self):
        budget = _resolve_history_budget(None)
        assert budget["token_budget"] > 0
        assert budget["max_messages"] > 0


# ---------------------------------------------------------------------------
# _extract_retry_after_seconds
# ---------------------------------------------------------------------------

class TestExtractRetryAfterSeconds:
    def test_extracts_integer_seconds(self):
        err = Exception("Rate limit exceeded. Please try again in 30s.")
        assert _extract_retry_after_seconds(err) == 30.0

    def test_extracts_float_seconds(self):
        err = Exception("try again in 2.5s after this message")
        assert _extract_retry_after_seconds(err) == 2.5

    def test_returns_none_when_not_found(self):
        err = Exception("Something else went wrong")
        assert _extract_retry_after_seconds(err) is None

    def test_case_insensitive(self):
        err = Exception("TRY AGAIN IN 10S please")
        assert _extract_retry_after_seconds(err) == 10.0


# ---------------------------------------------------------------------------
# _build_rate_limit_message
# ---------------------------------------------------------------------------

class TestBuildRateLimitMessage:
    def test_includes_retry_time_when_present(self):
        err = Exception("try again in 5s")
        msg = _build_rate_limit_message(err)
        assert "5.0s" in msg

    def test_generic_message_when_no_retry_time(self):
        err = Exception("rate limited")
        msg = _build_rate_limit_message(err)
        assert "retry" in msg.lower()


# ---------------------------------------------------------------------------
# _get_messages_for_llm
# ---------------------------------------------------------------------------

class TestGetMessagesForLlm:
    def _msgs(self, pairs):
        return [QueryMessage(role=r, content=c) for r, c in pairs]

    def test_single_user_question(self):
        packed, _ = _get_messages_for_llm("What is Python?")
        assert packed[-1]["role"] == "user"
        assert "Python" in packed[-1]["content"]

    def test_deduplicates_trailing_question(self):
        """If messages already ends with the same question, don't append it again."""
        messages = self._msgs([
            ("user", "What is Python?"),
            ("assistant", "A language"),
            ("user", "What is Python?"),
        ])
        packed, _ = _get_messages_for_llm("What is Python?", messages=messages)
        user_msgs = [m for m in packed if m["role"] == "user"]
        contents = [m["content"] for m in user_msgs]
        assert contents.count("What is Python?") == 1

    def test_respects_max_messages_limit(self):
        """With a small budget, older messages are dropped."""
        long_history = self._msgs(
            [("user", f"msg {i}") for i in range(20)]
        )
        packed, _ = _get_messages_for_llm(
            "final question",
            messages=long_history,
            model_name="gpt-4o-mini",  # smaller budget
        )
        from app.api.query import _resolve_history_budget
        budget = _resolve_history_budget("gpt-4o-mini")
        assert len(packed) <= budget["max_messages"]

    def test_filters_invalid_roles(self):
        messages = self._msgs([
            ("invalid_role", "ignored"),
            ("user", "valid"),
        ])
        packed, _ = _get_messages_for_llm("follow up", messages=messages)
        roles = [m["role"] for m in packed]
        assert "invalid_role" not in roles

    def test_filters_empty_content(self):
        messages = self._msgs([
            ("user", ""),
            ("assistant", "  "),
            ("user", "real question"),
        ])
        packed, _ = _get_messages_for_llm("next", messages=messages)
        for m in packed:
            assert m["content"].strip() != ""
