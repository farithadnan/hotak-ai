"""Query-related API routes."""

import re
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from openai import PermissionDeniedError, RateLimitError
from langchain.chat_models import init_chat_model

from ..storage.chat_storage import get_chat
from ..agents.rag_agent import create_rag_agent, validate_and_format_response
from ..config.settings import (
    LLM_MAX_TOKENS,
    LLM_MODEL,
    LLM_TEMPERATURE,
    STREAM_MAX_CHARS,
)
from ..utils.logger import setup_logger

logger = setup_logger(__name__)
router = APIRouter()

STREAM_MODEL_FALLBACK_PREFIX = "[[MODEL_FALLBACK:"


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
    messages: list[QueryMessage] | None = None


def _normalize_text(value: str) -> str:
    return " ".join(value.strip().split())


def _resolve_history_message_limit(model_name: str | None) -> int:
    """
    Resolve a conservative message-count window per model family.

    This is an intentionally simple placeholder until full token-based packing
    is implemented.
    """
    normalized = (model_name or "").lower()
    if not normalized:
        return 10
    if "mini" in normalized or "nano" in normalized:
        return 6
    return 10


def _get_messages_for_llm(
    question: str,
    chat_id: str | None = None,
    messages: list[QueryMessage] | None = None,
    history_limit: int = 10,
) -> list[dict[str, str]]:
    """
    Fetch chat history and combine with current question for the LLM.
    By default, limits history to the most recent messages.

    If `messages` is provided by the frontend, that history is used directly.
    """
    history: list[dict[str, str]] = []

    if messages:
        for message in messages[-max(1, history_limit):]:
            role = (message.role or "").strip()
            content = (message.content or "").strip()
            if role not in {"user", "assistant", "system"}:
                continue
            if not content:
                continue
            history.append({"role": role, "content": content})
    elif chat_id:
        chat = get_chat(chat_id)
        if chat and chat.messages:
            recent_messages = chat.messages[-max(1, history_limit):]
            for m in recent_messages:
                content = (m.content or "").strip()
                if not content:
                    continue
                history.append({"role": m.role, "content": content})

    # Avoid duplicating the latest user turn when it is already present in
    # persisted/frontend-provided history.
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


def _get_rag_agent_for_model(http_request: Request, requested_model: str | None):
    model_name = (requested_model or LLM_MODEL).strip() or LLM_MODEL

    if model_name == LLM_MODEL:
        return http_request.app.state.rag_agent, model_name

    cache = getattr(http_request.app.state, "rag_agents_by_model", None)
    if cache is None:
        cache = {}
        http_request.app.state.rag_agents_by_model = cache

    if model_name not in cache:
        logger.info("Creating model-specific RAG agent for model=%s", model_name)
        model_llm = init_chat_model(
            model=model_name,
            temperature=LLM_TEMPERATURE,
            max_tokens=LLM_MAX_TOKENS,
        )
        cache[model_name] = create_rag_agent(model_llm, http_request.app.state.vector_store)

    return cache[model_name], model_name


@router.post("/query")
async def query_endpoint(request: QueryRequest, http_request: Request):
    """Endpoint to handle user queries."""
    try:
        logger.info(f"Processing query: {request.question}")

        rag_agent, model_used = _get_rag_agent_for_model(http_request, request.model)

        warning_message = None
        history_limit = _resolve_history_message_limit(model_used)
        payload = {
            "messages": _get_messages_for_llm(
                request.question,
                request.chat_id,
                request.messages,
                history_limit=history_limit,
            )
        }

        try:
            response = rag_agent.invoke(payload)
        except PermissionDeniedError as e:
            if request.model and model_used != LLM_MODEL:
                warning_message = _build_model_access_message(model_used)
                logger.warning("Model access denied for %s. Falling back to %s", model_used, LLM_MODEL)
                model_used = LLM_MODEL
                response = http_request.app.state.rag_agent.invoke(payload)
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

        async def event_generator():
            rag_agent, model_used = _get_rag_agent_for_model(http_request, request.model)
            history_limit = _resolve_history_message_limit(model_used)
            payload = {
                "messages": _get_messages_for_llm(
                    request.question,
                    request.chat_id,
                    request.messages,
                    history_limit=history_limit,
                )
            }
            full_text = ""
            emitted_chars = 0
            max_stream_chars = max(500, STREAM_MAX_CHARS)

            def yield_delta(current_text: str):
                nonlocal full_text, emitted_chars

                if not current_text:
                    return None
                if current_text == full_text:
                    return None

                # Most providers stream cumulative text snapshots for the same response.
                if current_text.startswith(full_text):
                    delta = current_text[len(full_text):]
                else:
                    # Fallback when provider sends non-monotonic snapshots.
                    delta = current_text

                if not delta:
                    return None

                remaining = max_stream_chars - emitted_chars
                if remaining <= 0:
                    return None

                if len(delta) > remaining:
                    delta = delta[:remaining]

                full_text = current_text
                emitted_chars += len(delta)
                return delta

            try:
                # LangGraph/LangChain agents may expose async `astream` or sync `stream`.
                if hasattr(rag_agent, "astream"):
                    async for event in rag_agent.astream(payload, stream_mode="values"):
                        last_message = event["messages"][-1]
                        if not _is_assistant_message(last_message):
                            continue

                        content = _extract_text(last_message)
                        delta = yield_delta(content)
                        if delta is not None:
                            yield delta

                        if emitted_chars >= max_stream_chars:
                            break
                else:
                    for event in rag_agent.stream(payload, stream_mode="values"):
                        last_message = event["messages"][-1]
                        if not _is_assistant_message(last_message):
                            continue

                        content = _extract_text(last_message)
                        delta = yield_delta(content)
                        if delta is not None:
                            yield delta

                        if emitted_chars >= max_stream_chars:
                            break
            except PermissionDeniedError as stream_perm_error:
                if request.model:
                    logger.warning(
                        "Permission denied during stream for model=%s. Falling back to %s",
                        request.model,
                        LLM_MODEL,
                    )
                    # Emit metadata token for frontend to sync selected/persisted model.
                    yield f"{STREAM_MODEL_FALLBACK_PREFIX}{LLM_MODEL}]]\n"
                    notice = _build_model_access_message(request.model)
                    yield notice + "\n\nUsing default model instead.\n\n"

                    default_agent = http_request.app.state.rag_agent
                    full_text = ""
                    emitted_chars = 0

                    if hasattr(default_agent, "astream"):
                        async for event in default_agent.astream(payload, stream_mode="values"):
                            last_message = event["messages"][-1]
                            if not _is_assistant_message(last_message):
                                continue

                            content = _extract_text(last_message)
                            delta = yield_delta(content)
                            if delta is not None:
                                yield delta

                            if emitted_chars >= max_stream_chars:
                                break
                    else:
                        for event in default_agent.stream(payload, stream_mode="values"):
                            last_message = event["messages"][-1]
                            if not _is_assistant_message(last_message):
                                continue

                            content = _extract_text(last_message)
                            delta = yield_delta(content)
                            if delta is not None:
                                yield delta

                            if emitted_chars >= max_stream_chars:
                                break
                else:
                    logger.warning("Permission denied during stream: %s", stream_perm_error)
                    yield _build_model_access_message(request.model)
            except RateLimitError as stream_error:
                logger.warning("Rate limited during stream generation: %s", stream_error)
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
                    yield _build_model_access_message(request.model)
                except RateLimitError as fallback_rate_error:
                    logger.warning("Rate limited during stream fallback invoke: %s", fallback_rate_error)
                    yield _build_rate_limit_message(fallback_rate_error)
                except Exception as fallback_error:
                    logger.exception("Fallback invoke failed in stream endpoint: %s", fallback_error)

        return StreamingResponse(event_generator(), media_type="text/plain")

    except Exception as e:
        logger.error(f"Agent failed to process streaming query: {e}")
        raise HTTPException(status_code=500, detail=str(e))
