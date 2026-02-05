"""
Template storage using JSON file persistence.

This module handles CRUD operations for templates.
Templates are stored in a JSON file on disk.
"""

import json
import os
from pathlib import Path
from typing import List, Optional
from datetime import datetime

try:
    from ..models.template import Template, TemplateCreate, TemplateUpdate
    from ..utils.logger import setup_logger
except ImportError:
    # Fallback for direct execution
    import sys
    sys.path.insert(0, str(Path(__file__).parent.parent))
    from models.template import Template, TemplateCreate, TemplateUpdate
    from utils.logger import setup_logger

logger = setup_logger(__name__)

# Storage file location - stores in app/data/templates/
STORAGE_DIR = Path(__file__).parent.parent / "data" / "templates"
TEMPLATES_FILE = STORAGE_DIR / "templates.json"


def _ensure_storage_exists():
    """Create storage directory and file if they don't exist."""
    STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    if not TEMPLATES_FILE.exists():
        TEMPLATES_FILE.write_text("[]")
        logger.info(f"Created templates storage file: {TEMPLATES_FILE}")


def _load_templates_from_file() -> List[Template]:
    """Load all templates from JSON file."""
    _ensure_storage_exists()
    
    try:
        with open(TEMPLATES_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            templates = [Template(**item) for item in data]
            logger.debug(f"Loaded {len(templates)} templates from storage")
            return templates
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse templates file: {e}")
        return []
    except Exception as e:
        logger.error(f"Error loading templates: {e}")
        return []


def _save_templates_to_file(templates: List[Template]):
    """Save all templates to JSON file."""
    _ensure_storage_exists()
    
    try:
        data = [t.model_dump() for t in templates]
        with open(TEMPLATES_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        logger.debug(f"Saved {len(templates)} templates to storage")
    except Exception as e:
        logger.error(f"Error saving templates: {e}")
        raise


def create_template(template_data: TemplateCreate) -> Template:
    """
    Create a new template.
    
    Args:
        template_data: Template creation data
        
    Returns:
        Created template with generated ID and timestamp
        
    Raises:
        ValueError: If template with same name already exists
    """
    templates = _load_templates_from_file()
    
    # Check for duplicate name
    if any(t.name == template_data.name for t in templates):
        raise ValueError(f"Template with name '{template_data.name}' already exists")
    
    # Create new template
    new_template = Template(**template_data.model_dump())
    templates.append(new_template)
    
    _save_templates_to_file(templates)
    logger.info(f"Created template: {new_template.name} (ID: {new_template.id})")
    
    return new_template


def get_all_templates() -> List[Template]:
    """
    Get all templates.
    
    Returns:
        List of all templates
    """
    templates = _load_templates_from_file()
    logger.info(f"Retrieved {len(templates)} templates")
    return templates


def get_template(template_id: str) -> Optional[Template]:
    """
    Get a template by ID.
    
    Args:
        template_id: Template ID to retrieve
        
    Returns:
        Template if found, None otherwise
    """
    templates = _load_templates_from_file()
    template = next((t for t in templates if t.id == template_id), None)
    
    if template:
        logger.info(f"Retrieved template: {template.name} (ID: {template_id})")
    else:
        logger.warning(f"Template not found: {template_id}")
    
    return template


def update_template(template_id: str, update_data: TemplateUpdate) -> Optional[Template]:
    """
    Update an existing template.
    
    Args:
        template_id: Template ID to update
        update_data: Fields to update
        
    Returns:
        Updated template if found, None otherwise
        
    Raises:
        ValueError: If new name conflicts with existing template
    """
    templates = _load_templates_from_file()
    template = next((t for t in templates if t.id == template_id), None)
    
    if not template:
        logger.warning(f"Template not found for update: {template_id}")
        return None
    
    # Check for name conflict (if name is being updated)
    if update_data.name and update_data.name != template.name:
        if any(t.name == update_data.name for t in templates if t.id != template_id):
            raise ValueError(f"Template with name '{update_data.name}' already exists")
    
    # Update fields
    update_dict = update_data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(template, field, value)
    
    # Update timestamp
    template.updated_at = datetime.utcnow().isoformat()
    
    _save_templates_to_file(templates)
    logger.info(f"Updated template: {template.name} (ID: {template_id})")
    
    return template


def delete_template(template_id: str) -> bool:
    """
    Delete a template by ID.
    
    Args:
        template_id: Template ID to delete
        
    Returns:
        True if deleted, False if not found
    """
    templates = _load_templates_from_file()
    initial_count = len(templates)
    
    templates = [t for t in templates if t.id != template_id]
    
    if len(templates) < initial_count:
        _save_templates_to_file(templates)
        logger.info(f"Deleted template: {template_id}")
        return True
    else:
        logger.warning(f"Template not found for deletion: {template_id}")
        return False


def get_template_count() -> int:
    """
    Get total count of templates.
    
    Returns:
        Number of templates
    """
    templates = _load_templates_from_file()
    return len(templates)
