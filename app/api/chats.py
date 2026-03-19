"""Chat-related API routes."""

from fastapi import APIRouter, HTTPException, Request
from typing import List

from ..models.chat import Chat, ChatCreate, ChatUpdate, Message
from ..storage.chat_storage import (
    create_chat,
    get_all_chats,
    get_archived_chats,
    get_chat,
    update_chat,
    delete_chat,
    add_message_to_chat
)
from ..utils.logger import setup_logger

logger = setup_logger(__name__)
router = APIRouter()


@router.post("/chats", response_model=Chat, status_code=201)
async def create_chat_endpoint(chat_data: ChatCreate):
    """Create a new chat session."""
    try:
        chat = create_chat(chat_data)
        return chat
    except Exception as e:
        logger.error(f"Failed to create chat: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/chats", response_model=List[Chat])
async def list_chats_endpoint():
    """Get all chat sessions."""
    try:
        return get_all_chats()
    except Exception as e:
        logger.error(f"Failed to list chats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/chats/archived", response_model=List[Chat])
async def list_archived_chats_endpoint():
    """Get all archived chat sessions."""
    try:
        return get_archived_chats()
    except Exception as e:
        logger.error(f"Failed to list archived chats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/chats/{chat_id}", response_model=Chat)
async def get_chat_endpoint(chat_id: str):
    """Get a specific chat session by ID."""
    chat = get_chat(chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat session not found")
    return chat


@router.put("/chats/{chat_id}", response_model=Chat)
async def update_chat_endpoint(chat_id: str, update_data: ChatUpdate):
    """Update chat session metadata."""
    chat = update_chat(chat_id, update_data)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat session not found")
    return chat


@router.post("/chats/{chat_id}/generate-title", response_model=Chat)
async def generate_chat_title_endpoint(chat_id: str, request: Request):
    """Generate and persist a concise title based on the first user message."""
    chat = get_chat(chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat session not found")

    first_user_message = next(
        (m for m in chat.messages if m.role == "user" and m.content.strip()),
        None,
    )

    if not first_user_message:
        return chat

    try:
        prompt = (
            "Generate a concise chat title (max 6 words). "
            "Return only the title, no quotes, no punctuation at the end.\n\n"
            f"User message:\n{first_user_message.content.strip()[:700]}"
        )

        llm = request.app.state.llm
        llm_response = llm.invoke(prompt)

        generated_title = ""
        if hasattr(llm_response, "content") and isinstance(llm_response.content, str):
            generated_title = llm_response.content.strip()
        elif isinstance(llm_response, str):
            generated_title = llm_response.strip()

        generated_title = generated_title.strip('"').strip("'").strip()
        generated_title = generated_title.rstrip(".?!")

        if not generated_title:
            generated_title = "New Chat"

        if len(generated_title) > 64:
            generated_title = generated_title[:64].rstrip()

        updated_chat = update_chat(chat_id, ChatUpdate(title=generated_title))
        if not updated_chat:
            raise HTTPException(status_code=404, detail="Chat session not found")

        return updated_chat

    except Exception as e:
        logger.error(f"Failed to generate title for chat {chat_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/chats/{chat_id}")
async def delete_chat_endpoint(chat_id: str):
    """Delete a chat session."""
    if not delete_chat(chat_id):
        raise HTTPException(status_code=404, detail="Chat session not found")
    return {"message": "Chat session deleted successfully"}


@router.post("/chats/{chat_id}/messages", response_model=Chat)
async def add_message_endpoint(chat_id: str, message: Message):
    """Add a message to a chat session."""
    chat = add_message_to_chat(chat_id, message)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat session not found")
    return chat
