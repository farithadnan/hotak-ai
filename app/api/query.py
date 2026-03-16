"""Query-related API routes."""

import re
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from openai import RateLimitError
from langchain.chat_models import init_chat_model

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


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


class QueryRequest(BaseModel):
    """Request model for query endpoint."""
    question: str
    model: str | None = None


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

        response = rag_agent.invoke(
            {"messages": [{"role": "user", "content": request.question}]}
        )

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

        return {
            "answer": validated_response,
            "citation_info": citation_info,
            "model": model_used,
        }

    except RateLimitError as e:
        message = _build_rate_limit_message(e)
        retry_after = _extract_retry_after_seconds(e)
        headers = {"Retry-After": str(max(1, int(retry_after)))} if retry_after else None
        logger.warning("Rate limited in /query: %s", e)
        raise HTTPException(status_code=429, detail=message, headers=headers)

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
            payload = {"messages": [{"role": "user", "content": request.question}]}
            rag_agent, _ = _get_rag_agent_for_model(http_request, request.model)
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
                except RateLimitError as fallback_rate_error:
                    logger.warning("Rate limited during stream fallback invoke: %s", fallback_rate_error)
                    yield _build_rate_limit_message(fallback_rate_error)
                except Exception as fallback_error:
                    logger.exception("Fallback invoke failed in stream endpoint: %s", fallback_error)

        return StreamingResponse(event_generator(), media_type="text/plain")

    except Exception as e:
        logger.error(f"Agent failed to process streaming query: {e}")
        raise HTTPException(status_code=500, detail=str(e))
