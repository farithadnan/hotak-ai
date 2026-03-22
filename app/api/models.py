"""Model catalog API routes."""

from fastapi import APIRouter, Depends, HTTPException, Request

from ..models.user import UserDB
from ..services.auth import get_current_user
from ..services.model_settings import get_enabled_models
from ..utils.logger import setup_logger

logger = setup_logger(__name__)
router = APIRouter()


def _enabled_models(request: Request) -> list[dict]:
    """Return the admin-enabled subset of accessible models."""
    all_models: list[dict] = getattr(request.app.state, "accessible_models", None) or []
    enabled_ids = set(get_enabled_models())
    # Fall back to all accessible models if admin hasn't configured anything yet
    if not enabled_ids:
        return all_models
    return [m for m in all_models if m["id"] in enabled_ids]


@router.get("/models")
async def list_models_endpoint(
    request: Request,
    _current_user: UserDB = Depends(get_current_user),
):
    """List admin-enabled chat models."""
    models = getattr(request.app.state, "accessible_models", None)
    if models is None:
        raise HTTPException(status_code=503, detail="Model catalog not yet initialized. Try again in a moment.")
    return {"object": "list", "data": _enabled_models(request)}


@router.get("/models/{model_id}")
async def retrieve_model_endpoint(
    model_id: str,
    request: Request,
    _current_user: UserDB = Depends(get_current_user),
):
    """Retrieve a single model by ID from the enabled catalog."""
    model = next((m for m in _enabled_models(request) if m["id"] == model_id), None)
    if not model:
        raise HTTPException(status_code=404, detail=f"Model '{model_id}' not found or not enabled.")
    return model
