"""Model catalog API routes."""

from fastapi import APIRouter, HTTPException
from openai import OpenAI

from ..config.settings import OPENAI_API_KEY
from ..utils.logger import setup_logger

logger = setup_logger(__name__)
router = APIRouter()


def _get_openai_client() -> OpenAI:
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not configured")
    return OpenAI(api_key=OPENAI_API_KEY)


@router.get("/models")
async def list_models_endpoint():
    """List available OpenAI models."""
    try:
        client = _get_openai_client()
        models = client.models.list()

        # Keep response contract simple for frontend and mirror OpenAI fields.
        data = [
            {
                "id": model.id,
                "created": model.created,
                "object": model.object,
                "owned_by": model.owned_by,
            }
            for model in models.data
        ]

        return {
            "object": "list",
            "data": data,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to list OpenAI models: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/models/{model_id}")
async def retrieve_model_endpoint(model_id: str):
    """Retrieve a single OpenAI model."""
    try:
        client = _get_openai_client()
        model = client.models.retrieve(model_id)

        return {
            "id": model.id,
            "created": model.created,
            "object": model.object,
            "owned_by": model.owned_by,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to retrieve OpenAI model %s: %s", model_id, e)
        raise HTTPException(status_code=500, detail=str(e))
