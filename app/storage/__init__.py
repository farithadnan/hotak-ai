"""Vector store and data persistence module."""

# Export template storage functions
from .template_storage import (
    create_template,
    get_all_templates,
    get_template,
    update_template,
    delete_template,
    get_template_count
)

__all__ = [
    'create_template',
    'get_all_templates',
    'get_template',
    'update_template',
    'delete_template',
    'get_template_count'
]
