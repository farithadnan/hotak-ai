"""Model catalog API routes."""

from fastapi import APIRouter, HTTPException, Request

from ..utils.logger import setup_logger

logger = setup_logger(__name__)
router = APIRouter()


@router.get("/models")
async def list_models_endpoint(request: Request):
    """List accessible chat models (probed and cached at startup)."""
    models = getattr(request.app.state, "accessible_models", None)
    if models is None:
        raise HTTPException(status_code=503, detail="Model catalog not yet initialized. Try again in a moment.")
    return {"object": "list", "data": models}


@router.get("/models/{model_id}")
async def retrieve_model_endpoint(model_id: str, request: Request):
    """Retrieve a single model by ID from the accessible catalog."""
    models: list[dict] = getattr(request.app.state, "accessible_models", None) or []
    model = next((m for m in models if m["id"] == model_id), None)
    if not model:
        raise HTTPException(status_code=404, detail=f"Model '{model_id}' not found or not accessible with the current API key.")
    return model
