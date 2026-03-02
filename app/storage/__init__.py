"""Vector store and data persistence module."""

# Export template storage
from .template_storage import (
    create_template,
    get_all_templates,
    get_template,
    update_template,
    delete_template,
    get_template_count
)

# Export chat storage
from .chat_storage import (
    create_chat,
    get_all_chats,
    get_chat,
    update_chat,
    delete_chat,
    add_message_to_chat
)

__all__ = [
    'create_template',
    'get_all_templates',
    'get_template',
    'update_template',
    'delete_template',
    'get_template_count',
    'create_chat',
    'get_all_chats',
    'get_chat',
    'update_chat',
    'delete_chat',
    'add_message_to_chat'
]
