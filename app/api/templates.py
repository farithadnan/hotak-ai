"""Template-related API routes."""

from fastapi import APIRouter, HTTPException

from ..models.template import TemplateCreate, TemplateUpdate, Template
from ..utils.logger import setup_logger

logger = setup_logger(__name__)
router = APIRouter()


@router.post("/templates", status_code=201)
async def create_template_endpoint(template_data: TemplateCreate):
    """Create a new knowledge template."""
    try:
        from ..storage.template_storage import create_template

        logger.info(f"Creating template: {template_data.name}")
        template = create_template(template_data)
        logger.info(f"Template created successfully: {template.id}")

        return template

    except ValueError as e:
        logger.error(f"Validation error creating template: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to create template: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/templates", response_model=list[Template])
async def list_templates_endpoint():
    """Get all knowledge templates."""
    try:
        from ..storage.template_storage import get_all_templates

        logger.info("Listing all templates")
        templates = get_all_templates()

        return templates

    except Exception as e:
        logger.error(f"Failed to list templates: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/templates/{template_id}")
async def get_template_endpoint(template_id: str):
    """Get a specific template by ID."""
    try:
        from ..storage.template_storage import get_template

        logger.info(f"Getting template: {template_id}")
        template = get_template(template_id)

        if not template:
            raise HTTPException(status_code=404, detail=f"Template not found: {template_id}")

        return template

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get template: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/templates/{template_id}")
async def update_template_endpoint(template_id: str, update_data: TemplateUpdate):
    """Update an existing template. Only provided fields are updated."""
    try:
        from ..storage.template_storage import update_template

        logger.info(f"Updating template: {template_id}")
        template = update_template(template_id, update_data)

        if not template:
            raise HTTPException(status_code=404, detail=f"Template not found: {template_id}")

        logger.info(f"Template updated successfully: {template_id}")
        return template

    except ValueError as e:
        logger.error(f"Validation error updating template: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update template: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/templates/{template_id}")
async def delete_template_endpoint(template_id: str):
    """Delete a template by ID. This is permanent."""
    try:
        from ..storage.template_storage import delete_template

        logger.info(f"Deleting template: {template_id}")
        deleted = delete_template(template_id)

        if not deleted:
            raise HTTPException(status_code=404, detail=f"Template not found: {template_id}")

        logger.info(f"Template deleted successfully: {template_id}")
        return {"message": "Template deleted successfully", "id": template_id}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete template: {e}")
        raise HTTPException(status_code=500, detail=str(e))
