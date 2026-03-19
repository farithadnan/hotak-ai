"""
Model catalog service — discovers accessible OpenAI chat models.

On startup, the backend lists all OpenAI models, filters to likely
chat/completions candidates, probes each with a max_tokens=1 request to
verify the API key actually has access, and caches the result.

GET /models serves from this cache so the frontend never shows a model
the user can't use.
"""

import asyncio
from openai import AsyncOpenAI, OpenAI, PermissionDeniedError, NotFoundError, AuthenticationError

from ..utils.logger import setup_logger

logger = setup_logger(__name__)

_CHAT_PREFIXES = ('gpt-', 'o1', 'o3', 'o4', 'chatgpt-')
_CHAT_EXCLUDES = ('embedding', 'tts', 'transcribe', 'whisper', 'moderation', 'image', 'audio')


def is_chat_model(model_id: str) -> bool:
    """Return True if the model ID looks like a usable chat/completions model."""
    mid = model_id.lower()
    if not any(mid.startswith(p) for p in _CHAT_PREFIXES):
        return False
    return not any(tok in mid for tok in _CHAT_EXCLUDES)


async def _probe_model(client: AsyncOpenAI, model_id: str) -> bool:
    """
    Return True if the API key can make completions with this model.

    Uses max_tokens=1 to minimise cost. Treats PermissionDeniedError /
    NotFoundError / AuthenticationError as definitive "no access"; any
    other exception is treated as transient and the model is kept.
    """
    try:
        await asyncio.wait_for(
            client.chat.completions.create(
                model=model_id,
                messages=[{"role": "user", "content": "hi"}],
                max_tokens=1,
            ),
            timeout=8.0,
        )
        return True
    except (PermissionDeniedError, NotFoundError, AuthenticationError):
        logger.debug("Model %s is not accessible (permission/not found)", model_id)
        return False
    except asyncio.TimeoutError:
        logger.warning("Probe timed out for model %s — keeping in list", model_id)
        return True
    except Exception as exc:
        logger.warning("Unexpected error probing model %s (%s) — keeping in list", model_id, exc)
        return True


async def build_accessible_chat_models(api_key: str) -> list[dict]:
    """
    Return a list of chat model dicts the API key can actually use.

    Each dict mirrors the OpenAI model object:
        { "id": str, "created": int, "object": str, "owned_by": str }

    Steps:
      1. List all models via the sync client.
      2. Filter to chat model candidates via is_chat_model().
      3. Probe each candidate in parallel (max 8 s per probe).
      4. Return only the models whose probe succeeded.
    """
    if not api_key:
        logger.error("Cannot probe models: OPENAI_API_KEY is not set")
        return []

    try:
        all_models = OpenAI(api_key=api_key).models.list()
    except Exception as exc:
        logger.error("Failed to list OpenAI models during probe: %s", exc)
        return []

    candidates = [m for m in all_models.data if is_chat_model(m.id)]
    if not candidates:
        logger.warning("No chat model candidates found in OpenAI model list")
        return []

    logger.info("Probing %d chat model candidate(s) for API key access...", len(candidates))

    async_client = AsyncOpenAI(api_key=api_key)
    access_results = await asyncio.gather(
        *[_probe_model(async_client, m.id) for m in candidates],
    )

    accessible = [
        {"id": m.id, "created": m.created, "object": m.object, "owned_by": m.owned_by}
        for m, ok in zip(candidates, access_results)
        if ok
    ]

    logger.info(
        "Accessible chat models (%d/%d): %s",
        len(accessible),
        len(candidates),
        [m["id"] for m in accessible],
    )
    return accessible
