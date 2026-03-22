"""
Chat storage using JSON file persistence.

This module handles CRUD operations for chat sessions.
"""

import json
from pathlib import Path
from typing import List, Optional
from datetime import datetime

from ..models.chat import Chat, ChatCreate, ChatUpdate, Message
from ..utils.logger import setup_logger

logger = setup_logger(__name__)

# Storage file location - stores in app/data/chats/
STORAGE_DIR = Path(__file__).parent.parent / "data" / "chats"
CHATS_FILE = STORAGE_DIR / "chats.json"


def _ensure_storage_exists():
    """Create storage directory and file if they don't exist."""
    STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    if not CHATS_FILE.exists():
        CHATS_FILE.write_text("[]")
        logger.info(f"Created chats storage file: {CHATS_FILE}")


def _load_chats_from_file() -> List[Chat]:
    """Load all chats from JSON file."""
    _ensure_storage_exists()
    
    try:
        with open(CHATS_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            chats = [Chat(**item) for item in data]
            return chats
    except Exception as e:
        logger.error(f"Error loading chats: {e}")
        return []


def _save_chats_to_file(chats: List[Chat]):
    """Save all chats to JSON file."""
    _ensure_storage_exists()
    
    try:
        data = [c.model_dump() for c in chats]
        with open(CHATS_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    except Exception as e:
        logger.error(f"Error saving chats: {e}")
        raise


def create_chat(chat_data: ChatCreate, user_id: Optional[str] = None) -> Chat:
    """Create a new chat session."""
    chats = _load_chats_from_file()

    new_chat = Chat(**chat_data.model_dump(), user_id=user_id)
    chats.append(new_chat)

    _save_chats_to_file(chats)
    logger.info(f"Created chat session: {new_chat.title} (ID: {new_chat.id})")

    return new_chat


def get_all_chats(user_id: Optional[str] = None) -> List[Chat]:
    """Get all non-archived chat sessions, optionally scoped to a user."""
    chats = _load_chats_from_file()
    if user_id is not None:
        chats = [c for c in chats if c.user_id == user_id]
    return [c for c in chats if not c.archived]


def get_archived_chats(user_id: Optional[str] = None) -> List[Chat]:
    """Get all archived chat sessions, optionally scoped to a user."""
    chats = _load_chats_from_file()
    if user_id is not None:
        chats = [c for c in chats if c.user_id == user_id]
    return [c for c in chats if c.archived]


def get_chat(chat_id: str, user_id: Optional[str] = None) -> Optional[Chat]:
    """Get a chat session by ID, optionally verifying ownership."""
    chats = _load_chats_from_file()
    chat = next((c for c in chats if c.id == chat_id), None)
    if chat and user_id is not None and chat.user_id != user_id:
        return None
    return chat


def update_chat(chat_id: str, update_data: ChatUpdate, user_id: Optional[str] = None) -> Optional[Chat]:
    """Update chat session metadata (title, template)."""
    chats = _load_chats_from_file()
    chat = next((c for c in chats if c.id == chat_id), None)
    if chat and user_id is not None and chat.user_id != user_id:
        return None
    
    if not chat:
        return None
    
    update_dict = update_data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        if field == "messages" and isinstance(value, list):
            value = [m if isinstance(m, Message) else Message.model_validate(m) for m in value]
        setattr(chat, field, value)
    
    chat.updated_at = datetime.utcnow().isoformat()
    _save_chats_to_file(chats)
    
    return chat


def add_message_to_chat(chat_id: str, message: Message, user_id: Optional[str] = None) -> Optional[Chat]:
    """Add a message to an existing chat session."""
    chats = _load_chats_from_file()
    chat = next((c for c in chats if c.id == chat_id), None)
    if chat and user_id is not None and chat.user_id != user_id:
        return None
    
    if not chat:
        return None
    
    chat.messages.append(message)
    chat.updated_at = datetime.utcnow().isoformat()
    
    _save_chats_to_file(chats)
    return chat


def delete_chat(chat_id: str, user_id: Optional[str] = None) -> bool:
    """Delete a chat session, optionally verifying ownership."""
    chats = _load_chats_from_file()
    initial_count = len(chats)

    if user_id is not None:
        chats = [c for c in chats if not (c.id == chat_id and c.user_id == user_id)]
    else:
        chats = [c for c in chats if c.id != chat_id]

    if len(chats) < initial_count:
        _save_chats_to_file(chats)
        return True
    return False
