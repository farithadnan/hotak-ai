"""Template-related API routes."""

from fastapi import APIRouter, Depends, HTTPException

from ..models.template import TemplateCreate, TemplateUpdate, Template
from ..models.user import UserDB
from ..services.auth import get_current_user
from ..utils.logger import setup_logger

logger = setup_logger(__name__)
router = APIRouter()


@router.post("/templates", status_code=201)
async def create_template_endpoint(
    template_data: TemplateCreate,
    current_user: UserDB = Depends(get_current_user),
):
    """Create a new knowledge template."""
    try:
        from ..storage.template_storage import create_template

        template = create_template(template_data, user_id=current_user.id)
        logger.info(f"Template created: {template.id}")
        return template

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to create template: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/templates", response_model=list[Template])
async def list_templates_endpoint(current_user: UserDB = Depends(get_current_user)):
    """Get all knowledge templates for the current user."""
    try:
        from ..storage.template_storage import get_all_templates

        return get_all_templates(user_id=current_user.id)

    except Exception as e:
        logger.error(f"Failed to list templates: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/templates/{template_id}")
async def get_template_endpoint(
    template_id: str,
    current_user: UserDB = Depends(get_current_user),
):
    """Get a specific template by ID."""
    try:
        from ..storage.template_storage import get_template

        template = get_template(template_id, user_id=current_user.id)
        if not template:
            raise HTTPException(status_code=404, detail=f"Template not found: {template_id}")
        return template

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get template: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/templates/{template_id}")
async def update_template_endpoint(
    template_id: str,
    update_data: TemplateUpdate,
    current_user: UserDB = Depends(get_current_user),
):
    """Update an existing template."""
    try:
        from ..storage.template_storage import update_template

        template = update_template(template_id, update_data, user_id=current_user.id)
        if not template:
            raise HTTPException(status_code=404, detail=f"Template not found: {template_id}")
        return template

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update template: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/templates/{template_id}")
async def delete_template_endpoint(
    template_id: str,
    current_user: UserDB = Depends(get_current_user),
):
    """Delete a template by ID."""
    try:
        from ..storage.template_storage import delete_template

        if not delete_template(template_id, user_id=current_user.id):
            raise HTTPException(status_code=404, detail=f"Template not found: {template_id}")
        return {"message": "Template deleted successfully", "id": template_id}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete template: {e}")
        raise HTTPException(status_code=500, detail=str(e))
