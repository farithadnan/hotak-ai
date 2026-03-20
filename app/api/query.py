"""Query-related API routes."""

import asyncio
import re
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from openai import PermissionDeniedError, RateLimitError
from langchain.chat_models import init_chat_model
from langchain_core.messages import AIMessageChunk

from ..storage.chat_storage import get_chat
from ..agents.rag_agent import create_rag_agent, validate_and_format_response
from ..models.template import TemplateSettings
from ..config.settings import (
    CHAT_HISTORY_MAX_MESSAGES,
    CHAT_HISTORY_MAX_MESSAGE_TOKENS,
    CHAT_HISTORY_MAX_TOKENS,
    ENABLE_SUMMARY_MEMORY,
    LLM_MAX_TOKENS,
    LLM_MODEL,
    LLM_TEMPERATURE,
    RETRIEVAL_K,
    STREAM_MAX_CHARS,
    SUMMARY_MAX_TOKENS,
)
from ..utils.logger import setup_logger

logger = setup_logger(__name__)
router = APIRouter()

STREAM_MODEL_FALLBACK_PREFIX = "[[MODEL_FALLBACK:"

# In-memory summary cache: chat_id -> (overflow_count, summary_text)
# Ephemeral — intentionally not persisted across server restarts.
_summary_cache: dict[str, tuple[int, str]] = {}


def _extract_retry_after_seconds(error: Exception) -> float | None:
    message = str(error)
    match = re.search(r"try again in\s+([0-9]+(?:\.[0-9]+)?)s", message, flags=re.IGNORECASE)
    if not match:
        return None
    try:
        return float(match.group(1))
    except ValueError:
        return None


def _build_rate_limit_message(error: Exception) -> str:
    retry_after = _extract_retry_after_seconds(error)
    if retry_after is None:
        return "OpenAI rate limit reached. Please retry shortly."
    return f"OpenAI rate limit reached. Please retry in about {retry_after:.1f}s."


def _build_model_access_message(model_name: str | None) -> str:
    selected = model_name or "the selected model"
    return (
        f"Your project does not have access to {selected}. "
        f"Please choose a different model or request access in OpenAI settings."
    )


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


class QueryMessage(BaseModel):
    """Minimal message shape accepted from the frontend for LLM context."""
    role: str
    content: str


class QueryRequest(BaseModel):
    """Request model for query endpoint."""
    question: str
    chat_id: str | None = None
    model: str | None = None
    template_id: str | None = None
    messages: list[QueryMessage] | None = None


class AgentRuntimeConfig(BaseModel):
    model: str
    system_prompt: str | None = None
    retrieval_k: int | None = None
    temperature: float | None = None
    allowed_sources: list[str] | None = None


def _normalize_text(value: str) -> str:
    return " ".join(value.strip().split())


def _estimate_text_tokens(text: str) -> int:
    normalized = text.strip()
    if not normalized:
        return 0
    return max(1, (len(normalized) + 3) // 4)


def _estimate_message_tokens(role: str, content: str) -> int:
    return 6 + _estimate_text_tokens(role) + _estimate_text_tokens(content)


def _truncate_content_to_token_budget(content: str, token_budget: int, suffix: str = "") -> str:
    normalized = content.strip()
    if not normalized or token_budget <= 0:
        return ""

    if _estimate_text_tokens(normalized) <= token_budget:
        return normalized

    suffix_text = suffix or ""
    suffix_chars = len(suffix_text)
    max_chars = max(80, token_budget * 4)
    keep_chars = max(32, max_chars - suffix_chars)

    if keep_chars >= len(normalized):
        return normalized

    return normalized[:keep_chars].rstrip() + suffix_text


def _resolve_history_budget(model_name: str | None) -> dict[str, int]:
    """Return conservative chat-history packing budgets for the selected model."""
    normalized = (model_name or "").lower()
    token_budget = CHAT_HISTORY_MAX_TOKENS
    per_message_budget = CHAT_HISTORY_MAX_MESSAGE_TOKENS
    max_messages = CHAT_HISTORY_MAX_MESSAGES

    if "mini" in normalized or "nano" in normalized:
        token_budget = max(900, int(token_budget * 0.75))
        per_message_budget = max(250, int(per_message_budget * 0.8))
        max_messages = max(4, min(max_messages, 8))
    elif "o1" in normalized or "o3" in normalized or "o4" in normalized:
        token_budget = int(token_budget * 1.25)
        per_message_budget = int(per_message_budget * 1.15)
        max_messages = max_messages + 2

    return {
        "token_budget": token_budget,
        "per_message_budget": per_message_budget,
        "max_messages": max_messages,
    }


def _prepare_history_source_messages(
    question: str,
    chat_id: str | None = None,
    messages: list[QueryMessage] | None = None,
) -> list[dict[str, str]]:
    history: list[dict[str, str]] = []

    if messages:
        for message in messages:
            role = (message.role or "").strip()
            content = (message.content or "").strip()
            if role not in {"user", "assistant", "system"} or not content:
                continue
            history.append({"role": role, "content": content})
    elif chat_id:
        chat = get_chat(chat_id)
        if chat and chat.messages:
            for message in chat.messages:
                content = (message.content or "").strip()
                if not content:
                    continue
                history.append({"role": message.role, "content": content})

    should_append_question = True
    if history:
        last = history[-1]
        if (
            last.get("role") == "user"
            and _normalize_text(last.get("content", "")) == _normalize_text(question)
        ):
            should_append_question = False

    if should_append_question:
        history.append({"role": "user", "content": question})

    return history


def _get_messages_for_llm(
    question: str,
    chat_id: str | None = None,
    messages: list[QueryMessage] | None = None,
    model_name: str | None = None,
) -> tuple[list[dict[str, str]], list[dict[str, str]]]:
    """
    Build a packed history window for the LLM using a conservative token budget.
    Returns (packed_messages, source_messages) so callers can detect overflow.
    """
    source_messages = _prepare_history_source_messages(question, chat_id, messages)
    budget = _resolve_history_budget(model_name)
    token_budget = max(250, budget["token_budget"])
    per_message_budget = max(120, budget["per_message_budget"])
    max_messages = max(1, budget["max_messages"])
    truncation_suffix = "\n\n[Earlier content omitted for token budget.]"
    question_normalized = _normalize_text(question)

    packed_reversed: list[dict[str, str]] = []
    tokens_used = 0

    for message in reversed(source_messages):
        if len(packed_reversed) >= max_messages:
            break

        role = message["role"]
        content = message["content"]
        is_current_question = role == "user" and _normalize_text(content) == question_normalized
        current_message_budget = per_message_budget * 2 if is_current_question else per_message_budget

        truncated_content = _truncate_content_to_token_budget(
            content,
            current_message_budget,
            "" if is_current_question else truncation_suffix,
        )

        if not truncated_content:
            continue

        message_tokens = _estimate_message_tokens(role, truncated_content)
        remaining_tokens = token_budget - tokens_used

        if message_tokens > remaining_tokens:
            truncated_content = _truncate_content_to_token_budget(
                content,
                max(remaining_tokens - 8, 0),
                "" if is_current_question else truncation_suffix,
            )
            if not truncated_content:
                if packed_reversed:
                    continue
                truncated_content = _truncate_content_to_token_budget(content, 80)

            message_tokens = _estimate_message_tokens(role, truncated_content)
            if packed_reversed and message_tokens > remaining_tokens:
                continue

        packed_reversed.append({"role": role, "content": truncated_content})
        tokens_used += message_tokens

        if tokens_used >= token_budget:
            break

    packed_messages = list(reversed(packed_reversed))
    logger.info(
        "Packed history for model=%s with %s/%s messages and ~%s/%s tokens",
        model_name or LLM_MODEL,
        len(packed_messages),
        len(source_messages),
        tokens_used,
        token_budget,
    )
    return packed_messages, source_messages


def _resolve_agent_runtime_config(http_request: Request, request: QueryRequest) -> AgentRuntimeConfig:
    template_settings: TemplateSettings | None = None
    allowed_sources: list[str] | None = None

    if request.template_id:
        try:
            from ..storage.template_storage import get_template

            template = get_template(request.template_id)
            if template:
                template_settings = template.settings
                sources = [s for s in template.sources if s]
                allowed_sources = sources if sources else None
            else:
                logger.warning("Template not found for query runtime config: %s", request.template_id)
        except Exception as template_error:
            logger.warning("Failed to load template settings for %s: %s", request.template_id, template_error)

    model_name = (
        request.model
        or (template_settings.model if template_settings else None)
        or LLM_MODEL
    )
    model_name = model_name.strip() or LLM_MODEL

    system_prompt = template_settings.system_prompt if template_settings else None
    retrieval_k = template_settings.retrieval_k if template_settings else None
    temperature = template_settings.temperature if template_settings else None

    return AgentRuntimeConfig(
        model=model_name,
        system_prompt=system_prompt,
        retrieval_k=retrieval_k,
        temperature=temperature,
        allowed_sources=allowed_sources,
    )


async def _get_or_update_summary(
    chat_id: str,
    overflow_messages: list[dict[str, str]],
) -> str | None:
    """Return a cached or freshly generated summary of messages that overflowed the history window."""
    cached = _summary_cache.get(chat_id)
    if cached and cached[0] >= len(overflow_messages):
        return cached[1]

    transcript = "\n".join(
        f"{m['role'].capitalize()}: {m['content'][:400]}"
        for m in overflow_messages
    )
    summary_llm = init_chat_model(model="gpt-4o-mini", temperature=0, max_tokens=SUMMARY_MAX_TOKENS)
    try:
        response = await summary_llm.ainvoke([
            {
                "role": "system",
                "content": (
                    "Summarize the following conversation excerpt in 3-5 sentences. "
                    "Preserve key facts, decisions, and context that would help continue the conversation."
                ),
            },
            {"role": "user", "content": transcript},
        ])
        summary = (response.content or "").strip()
        if summary:
            _summary_cache[chat_id] = (len(overflow_messages), summary)
            logger.info("Generated summary for chat=%s covering %s overflow messages", chat_id, len(overflow_messages))
            return summary
    except Exception as exc:
        logger.warning("Failed to generate conversation summary for chat=%s: %s", chat_id, exc)

    return None


async def _build_payload_messages_with_system_prompt(
    question: str,
    chat_id: str | None,
    messages: list[QueryMessage] | None,
    model_name: str,
    system_prompt: str | None,
) -> list[dict[str, str]]:
    packed_messages, source_messages = _get_messages_for_llm(question, chat_id, messages, model_name=model_name)

    # --- Rolling summary injection ---
    summary_message: dict[str, str] | None = None
    if ENABLE_SUMMARY_MEMORY and chat_id:
        non_system_source = [m for m in source_messages if m.get("role") != "system"]
        non_system_packed = [m for m in packed_messages if m.get("role") != "system"]
        if len(non_system_source) > len(non_system_packed):
            overflow_count = len(non_system_source) - len(non_system_packed)
            overflow_messages = non_system_source[:overflow_count]
            summary_text = await _get_or_update_summary(chat_id, overflow_messages)
            if summary_text:
                summary_message = {
                    "role": "system",
                    "content": f"Summary of earlier conversation:\n{summary_text}",
                }

    # --- Assemble final message list ---
    normalized_system_prompt = (system_prompt or "").strip()

    # Strip any leading system message already in packed_messages to avoid duplication
    rest = packed_messages
    if rest and rest[0].get("role") == "system":
        rest = rest[1:]

    header: list[dict[str, str]] = []
    if normalized_system_prompt:
        header.append({"role": "system", "content": normalized_system_prompt})
    if summary_message:
        header.append(summary_message)

    if not header:
        return packed_messages

    return [*header, *rest]


def _get_rag_agent_for_config(http_request: Request, runtime_config: AgentRuntimeConfig):
    model_name = runtime_config.model

    using_defaults = (
        model_name == LLM_MODEL
        and not runtime_config.system_prompt
        and runtime_config.retrieval_k in {None, RETRIEVAL_K}
        and runtime_config.temperature in {None, LLM_TEMPERATURE}
        and not runtime_config.allowed_sources
    )

    if using_defaults:
        return http_request.app.state.rag_agent, model_name

    cache = getattr(http_request.app.state, "rag_agents_by_model", None)
    if cache is None:
        cache = {}
        http_request.app.state.rag_agents_by_model = cache

    sources_key = "|".join(sorted(runtime_config.allowed_sources)) if runtime_config.allowed_sources else ""
    cache_key = "||".join([
        model_name,
        str(runtime_config.retrieval_k if runtime_config.retrieval_k is not None else RETRIEVAL_K),
        f"{runtime_config.temperature if runtime_config.temperature is not None else LLM_TEMPERATURE}",
        runtime_config.system_prompt or "",
        sources_key,
    ])

    if cache_key not in cache:
        logger.info(
            "Creating RAG agent for model=%s retrieval_k=%s temperature=%s sources=%s",
            model_name,
            runtime_config.retrieval_k,
            runtime_config.temperature,
            len(runtime_config.allowed_sources) if runtime_config.allowed_sources else "all",
        )
        model_llm = init_chat_model(
            model=model_name,
            temperature=runtime_config.temperature if runtime_config.temperature is not None else LLM_TEMPERATURE,
            max_tokens=LLM_MAX_TOKENS,
        )
        cache[cache_key] = create_rag_agent(
            model_llm,
            http_request.app.state.vector_store,
            system_prompt=runtime_config.system_prompt,
            retrieval_k=runtime_config.retrieval_k,
            allowed_sources=runtime_config.allowed_sources,
        )

    return cache[cache_key], model_name


@router.post("/query")
async def query_endpoint(request: QueryRequest, http_request: Request):
    """Endpoint to handle user queries."""
    try:
        logger.info(f"Processing query: {request.question}")

        runtime_config = _resolve_agent_runtime_config(http_request, request)
        rag_agent, model_used = _get_rag_agent_for_config(http_request, runtime_config)

        warning_message = None
        payload = {
            "messages": await _build_payload_messages_with_system_prompt(
                request.question,
                request.chat_id,
                request.messages,
                model_name=runtime_config.model,
                system_prompt=runtime_config.system_prompt,
            )
        }

        try:
            response = rag_agent.invoke(payload)
        except PermissionDeniedError as e:
            if model_used != LLM_MODEL:
                warning_message = _build_model_access_message(model_used)
                logger.warning("Model access denied for %s. Falling back to %s", model_used, LLM_MODEL)
                model_used = LLM_MODEL
                fallback_config = AgentRuntimeConfig(
                    model=LLM_MODEL,
                    system_prompt=runtime_config.system_prompt,
                    retrieval_k=runtime_config.retrieval_k,
                    temperature=runtime_config.temperature,
                )
                fallback_agent, _ = _get_rag_agent_for_config(http_request, fallback_config)
                response = fallback_agent.invoke(payload)
            else:
                raise e

        final_message = response["messages"][-1]

        full_response = ""
        if hasattr(final_message, "content"):
            content = final_message.content
            if isinstance(content, str):
                full_response = content

        top_docs = http_request.app.state.vector_store.similarity_search(request.question, k=5)

        validated_response = full_response
        citation_info = "No citations validated"

        if top_docs and full_response:
            validated_response, citation_info = validate_and_format_response(
                full_response, top_docs
            )
            logger.info(f"Citation check: {citation_info}")

        logger.info("Query processed successfully.")

        result = {
            "answer": validated_response,
            "citation_info": citation_info,
            "model": model_used,
        }

        if warning_message:
            result["warning"] = warning_message

        return result

    except RateLimitError as e:
        message = _build_rate_limit_message(e)
        retry_after = _extract_retry_after_seconds(e)
        headers = {"Retry-After": str(max(1, int(retry_after)))} if retry_after else None
        logger.warning("Rate limited in /query: %s", e)
        raise HTTPException(status_code=429, detail=message, headers=headers)

    except PermissionDeniedError as e:
        message = _build_model_access_message(request.model)
        logger.warning("Permission denied in /query for model=%s: %s", request.model, e)
        raise HTTPException(status_code=403, detail=message)

    except Exception as e:
        logger.error(f"Agent failed to process query: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/query/stream")
async def query_stream_endpoint(request: QueryRequest, http_request: Request):
    """Endpoint to handle streaming user queries."""
    try:
        logger.info(f"Processing streaming query: {request.question}")

        def _is_assistant_message(message) -> bool:
            message_type = getattr(message, "type", "")
            message_role = getattr(message, "role", "")
            return message_type in {"ai", "assistant"} or message_role == "assistant"

        def _extract_text(message) -> str:
            content = getattr(message, "content", "")
            if isinstance(content, str):
                return content
            if isinstance(content, list):
                text_parts = []
                for item in content:
                    if isinstance(item, dict) and item.get("type") == "text":
                        text_parts.append(item.get("text", ""))
                    elif isinstance(item, str):
                        text_parts.append(item)
                return "".join(text_parts)
            return ""

        def _extract_last_assistant_text_from_response(response: dict) -> str:
            messages = response.get("messages", []) if isinstance(response, dict) else []
            for message in reversed(messages):
                if _is_assistant_message(message):
                    return _extract_text(message)
            return ""

        def _extract_chunk_text(token) -> str:
            """Extract text from an AIMessageChunk (incremental token delta)."""
            content = getattr(token, "content", "")
            if isinstance(content, str):
                return content
            if isinstance(content, list):
                parts = []
                for item in content:
                    if isinstance(item, dict) and item.get("type") == "text":
                        parts.append(item.get("text", ""))
                    elif isinstance(item, str):
                        parts.append(item)
                return "".join(parts)
            return ""

        async def _stream_agent(agent, payload, max_stream_chars):
            """Yield incremental text tokens from an agent using stream_mode='messages'.
            Only AIMessageChunk tokens are emitted — ToolMessages (retrieved docs) are skipped.
            """
            emitted_chars = 0
            if hasattr(agent, "astream"):
                async for token, _metadata in agent.astream(payload, stream_mode="messages"):
                    if not isinstance(token, AIMessageChunk):
                        continue
                    text = _extract_chunk_text(token)
                    if not text:
                        continue
                    remaining = max_stream_chars - emitted_chars
                    if remaining <= 0:
                        break
                    if len(text) > remaining:
                        text = text[:remaining]
                    emitted_chars += len(text)
                    yield text
                    if emitted_chars >= max_stream_chars:
                        break
            else:
                for token, _metadata in agent.stream(payload, stream_mode="messages"):
                    if not isinstance(token, AIMessageChunk):
                        continue
                    text = _extract_chunk_text(token)
                    if not text:
                        continue
                    remaining = max_stream_chars - emitted_chars
                    if remaining <= 0:
                        break
                    if len(text) > remaining:
                        text = text[:remaining]
                    emitted_chars += len(text)
                    yield text
                    if emitted_chars >= max_stream_chars:
                        break

        async def event_generator():
            runtime_config = _resolve_agent_runtime_config(http_request, request)
            rag_agent, model_used = _get_rag_agent_for_config(http_request, runtime_config)
            payload = {
                "messages": await _build_payload_messages_with_system_prompt(
                    request.question,
                    request.chat_id,
                    request.messages,
                    model_name=runtime_config.model,
                    system_prompt=runtime_config.system_prompt,
                )
            }
            max_stream_chars = max(500, STREAM_MAX_CHARS)

            try:
                async for text in _stream_agent(rag_agent, payload, max_stream_chars):
                    yield text
            except PermissionDeniedError as stream_perm_error:
                if model_used != LLM_MODEL:
                    logger.warning(
                        "Permission denied during stream for model=%s. Falling back to %s",
                        model_used,
                        LLM_MODEL,
                    )
                    yield f"{STREAM_MODEL_FALLBACK_PREFIX}{LLM_MODEL}]]\n"
                    notice = _build_model_access_message(model_used)
                    yield notice + "\n\nUsing default model instead.\n\n"

                    fallback_config = AgentRuntimeConfig(
                        model=LLM_MODEL,
                        system_prompt=runtime_config.system_prompt,
                        retrieval_k=runtime_config.retrieval_k,
                        temperature=runtime_config.temperature,
                    )
                    default_agent, _ = _get_rag_agent_for_config(http_request, fallback_config)
                    async for text in _stream_agent(default_agent, payload, max_stream_chars):
                        yield text
                else:
                    logger.warning("Permission denied during stream: %s", stream_perm_error)
                    yield _build_model_access_message(model_used)
            except RateLimitError as stream_error:
                logger.warning("Rate limited during stream generation: %s", stream_error)
                retry_after = _extract_retry_after_seconds(stream_error)
                if retry_after is not None:
                    # One-shot retry for short-lived TPM spikes.
                    retry_delay = max(0.5, min(retry_after, 8.0))
                    logger.info("Retrying stream fallback invoke after %.2fs", retry_delay)
                    try:
                        await asyncio.sleep(retry_delay)
                        fallback_response = rag_agent.invoke(payload)
                        fallback_text = _extract_last_assistant_text_from_response(fallback_response)
                        if fallback_text:
                            yield fallback_text[:max_stream_chars]
                            return
                    except RateLimitError as retry_rate_error:
                        logger.warning("Rate limited again during delayed fallback invoke: %s", retry_rate_error)
                        yield _build_rate_limit_message(retry_rate_error)
                    except Exception as retry_error:
                        logger.exception("Delayed fallback invoke failed after rate limit: %s", retry_error)
                        yield _build_rate_limit_message(stream_error)
                else:
                    yield _build_rate_limit_message(stream_error)
            except Exception as stream_error:
                logger.exception("Streaming failed; falling back to non-stream invoke: %s", stream_error)
                try:
                    fallback_response = rag_agent.invoke(payload)
                    fallback_text = _extract_last_assistant_text_from_response(fallback_response)
                    if fallback_text:
                        yield fallback_text[:max_stream_chars]
                except PermissionDeniedError as fallback_permission_error:
                    logger.warning("Permission denied during stream fallback invoke: %s", fallback_permission_error)
                    yield _build_model_access_message(model_used)
                except RateLimitError as fallback_rate_error:
                    logger.warning("Rate limited during stream fallback invoke: %s", fallback_rate_error)
                    yield _build_rate_limit_message(fallback_rate_error)
                except Exception as fallback_error:
                    logger.exception("Fallback invoke failed in stream endpoint: %s", fallback_error)

        return StreamingResponse(event_generator(), media_type="text/plain")

    except Exception as e:
        logger.error(f"Agent failed to process streaming query: {e}")
        raise HTTPException(status_code=500, detail=str(e))
