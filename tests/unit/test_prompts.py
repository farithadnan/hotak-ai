"""Unit tests for the system prompt content and behaviour contract."""

from app.config.prompts import SYSTEM_PROMPT


def test_system_prompt_is_non_empty():
    assert SYSTEM_PROMPT and SYSTEM_PROMPT.strip()


def test_system_prompt_allows_general_knowledge():
    """The prompt must NOT tell the LLM to say 'I don't know' when no docs are found.
    Previously the prompt had 'just say you don't know' unconditionally, breaking
    generic Q&A (greetings, math, geography, etc.)."""
    lowered = SYSTEM_PROMPT.lower()
    # Must NOT instruct blanket "I don't know" / "i don't know" after retrieval
    assert "just say you don't know" not in lowered
    assert "say i don't know" not in lowered


def test_system_prompt_guides_retrieval_tool_usage():
    """Prompt must still mention the retrieve_context tool so the agent knows it exists."""
    assert "retrieve_context" in SYSTEM_PROMPT


def test_system_prompt_allows_own_knowledge_fallback():
    """Prompt must explicitly permit answering from own knowledge when docs are absent."""
    lowered = SYSTEM_PROMPT.lower()
    assert "own knowledge" in lowered or "general knowledge" in lowered or "directly" in lowered


def test_system_prompt_has_citation_instructions():
    assert "Sources" in SYSTEM_PROMPT
    assert "[1]" in SYSTEM_PROMPT or "[n]" in SYSTEM_PROMPT


def test_system_prompt_has_code_formatting_instructions():
    assert "```" in SYSTEM_PROMPT
