"""Admin-only API routes — user management, model settings, and provider config."""

from typing import Literal, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..db import get_db
from ..models.user import UserCreate, UserDB, UserResponse
from ..services.auth import get_current_admin, hash_password
from ..services.model_settings import get_default_model, get_enabled_models, update_model_settings
from ..utils.logger import setup_logger

logger = setup_logger(__name__)
router = APIRouter(prefix="/admin", tags=["admin"])


# ---------------------------------------------------------------------------
# User management
# ---------------------------------------------------------------------------

@router.get("/users", response_model=list[UserResponse])
def list_users(
    _admin: UserDB = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """List all users."""
    return db.query(UserDB).order_by(UserDB.created_at).all()


@router.post("/users", response_model=UserResponse, status_code=201)
def create_user(
    user_data: UserCreate,
    _admin: UserDB = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Create a new user account (admin only)."""
    if db.query(UserDB).filter(UserDB.username == user_data.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    if db.query(UserDB).filter(UserDB.email == user_data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = UserDB(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hash_password(user_data.password),
        role=user_data.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    logger.info(f"Admin created user: {user.username} (role={user.role})")
    return user


class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    role: Optional[Literal["admin", "user"]] = None


class PasswordReset(BaseModel):
    new_password: str = Field(..., min_length=8)


@router.patch("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: str,
    body: UserUpdate,
    admin: UserDB = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Edit a user account (admin only)."""
    user = db.query(UserDB).filter(UserDB.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot edit your own account via admin panel")
    if user.role == "admin":
        raise HTTPException(status_code=400, detail="Cannot edit another admin account")
    if body.username is not None:
        conflict = db.query(UserDB).filter(UserDB.username == body.username, UserDB.id != user_id).first()
        if conflict:
            raise HTTPException(status_code=400, detail="Username already taken")
        user.username = body.username
    if body.email is not None:
        conflict = db.query(UserDB).filter(UserDB.email == body.email, UserDB.id != user_id).first()
        if conflict:
            raise HTTPException(status_code=400, detail="Email already registered")
        user.email = body.email
    if body.role is not None:
        user.role = body.role
    db.commit()
    db.refresh(user)
    logger.info(f"Admin updated user: {user.username}")
    return user


@router.post("/users/{user_id}/reset-password", response_model=UserResponse)
def reset_user_password(
    user_id: str,
    body: PasswordReset,
    admin: UserDB = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Reset a user's password (admin only)."""
    user = db.query(UserDB).filter(UserDB.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Use profile settings to change your own password")
    if user.role == "admin":
        raise HTTPException(status_code=400, detail="Cannot reset another admin's password")
    user.hashed_password = hash_password(body.new_password)
    db.commit()
    db.refresh(user)
    logger.info(f"Admin reset password for user: {user.username}")
    return user


@router.patch("/users/{user_id}/lock", response_model=UserResponse)
def lock_user(
    user_id: str,
    admin: UserDB = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Lock a user account (prevent login)."""
    user = db.query(UserDB).filter(UserDB.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot lock your own account")
    if user.role == "admin":
        raise HTTPException(status_code=400, detail="Cannot lock another admin account")
    user.is_active = False
    db.commit()
    db.refresh(user)
    logger.info(f"User locked: {user.username}")
    return user


@router.patch("/users/{user_id}/unlock", response_model=UserResponse)
def unlock_user(
    user_id: str,
    _admin: UserDB = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Unlock a user account."""
    user = db.query(UserDB).filter(UserDB.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = True
    db.commit()
    db.refresh(user)
    logger.info(f"User unlocked: {user.username}")
    return user


@router.delete("/users/{user_id}", status_code=204)
def delete_user(
    user_id: str,
    admin: UserDB = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Permanently delete a user account."""
    user = db.query(UserDB).filter(UserDB.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    if user.role == "admin":
        raise HTTPException(status_code=400, detail="Cannot delete another admin account")
    db.delete(user)
    db.commit()
    logger.info(f"User deleted: {user.username}")


# ---------------------------------------------------------------------------
# Model settings
# ---------------------------------------------------------------------------

class ModelSettingsUpdate(BaseModel):
    enabled_models: list[str] = Field(..., min_length=1)
    default_model: Optional[str] = None


class ModelSettingsResponse(BaseModel):
    enabled_models: list[str]
    default_model: Optional[str]
    accessible_models: list[str]


@router.get("/models", response_model=ModelSettingsResponse)
def get_model_settings(
    _admin: UserDB = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Get current model settings and the full list of API-accessible models."""
    from ..services.model_catalog import get_accessible_models_cache
    return ModelSettingsResponse(
        enabled_models=get_enabled_models(),
        default_model=get_default_model(),
        accessible_models=get_accessible_models_cache(),
    )


@router.put("/models", response_model=ModelSettingsResponse)
def update_models(
    body: ModelSettingsUpdate,
    _admin: UserDB = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Update which models users can select and which is the default."""
    from ..services.model_catalog import get_accessible_models_cache
    accessible = get_accessible_models_cache()
    invalid = [m for m in body.enabled_models if m not in accessible]
    if invalid:
        raise HTTPException(status_code=400, detail=f"Models not accessible: {invalid}")
    if body.default_model and body.default_model not in body.enabled_models:
        raise HTTPException(status_code=400, detail="Default model must be in enabled list")

    data = update_model_settings(body.enabled_models, body.default_model)
    return ModelSettingsResponse(
        enabled_models=data["enabled_models"],
        default_model=data["default_model"],
        accessible_models=accessible,
    )


# ---------------------------------------------------------------------------
# System settings
# ---------------------------------------------------------------------------

class SystemSettingsSchema(BaseModel):
    llm_temperature: float = 0.2
    llm_max_tokens: int = 4096
    stream_max_chars: int = 32000
    chat_history_max_tokens: int = 2800
    chat_history_max_message_tokens: int = 700
    chat_history_max_messages: int = 10
    chunk_size: int = 1000
    chunk_overlap: int = 200
    retrieval_k: int = 5
    summary_max_tokens: int = 200
    enable_summary_memory: bool = True
    max_upload_file_size_mb: int = 10
    access_token_expire_minutes: int = 10080


@router.get("/system", response_model=SystemSettingsSchema)
def get_system_settings_endpoint(_admin: UserDB = Depends(get_current_admin)):
    """Get current system settings."""
    from ..services.system_settings import get_system_settings
    return get_system_settings()


@router.put("/system", response_model=SystemSettingsSchema)
def update_system_settings_endpoint(
    body: SystemSettingsSchema,
    _admin: UserDB = Depends(get_current_admin),
):
    """Update system settings (take effect on next server restart)."""
    from ..services.system_settings import update_system_settings
    return update_system_settings(body.model_dump())


# ---------------------------------------------------------------------------
# Provider settings (API keys + endpoints)
# ---------------------------------------------------------------------------

class ProviderSettingsResponse(BaseModel):
    openai_api_key_preview: str
    openai_api_key_set: bool
    openai_api_key_source: str   # "db" | "env" | "none"
    ollama_base_url: str
    ollama_base_url_source: str  # "db" | "env"


class ProviderSettingsUpdate(BaseModel):
    openai_api_key: Optional[str] = None  # None = don't change; "" = clear DB value
    ollama_base_url: Optional[str] = None


class ProviderTestRequest(BaseModel):
    provider: str   # "openai" | "ollama"
    value: str      # API key or base URL to test


@router.get("/providers", response_model=ProviderSettingsResponse)
def get_providers(_admin: UserDB = Depends(get_current_admin)):
    """Get current provider settings (API key is masked)."""
    from ..services.provider_settings import get_provider_settings
    return get_provider_settings()


@router.put("/providers", response_model=ProviderSettingsResponse)
async def update_providers(
    body: ProviderSettingsUpdate,
    http_request: Request,
    _admin: UserDB = Depends(get_current_admin),
):
    """
    Update provider settings and immediately re-probe accessible models.
    The new model list is pushed to app.state so the frontend sees it without a restart.
    """
    from ..services.provider_settings import update_provider_settings, get_effective_openai_key, get_effective_ollama_url
    from ..services.model_catalog import build_accessible_chat_models, get_ollama_models
    from ..services.model_settings import initialize_model_settings

    result = update_provider_settings(body.openai_api_key, body.ollama_base_url)

    # Re-probe models with updated credentials
    effective_key = get_effective_openai_key()
    effective_ollama = get_effective_ollama_url()
    openai_models = await build_accessible_chat_models(effective_key)
    ollama_models = await get_ollama_models(effective_ollama)
    all_models = openai_models + ollama_models

    http_request.app.state.accessible_models = all_models
    initialize_model_settings([m["id"] for m in all_models])

    logger.info("Provider settings saved; %d model(s) now accessible.", len(all_models))
    return result


@router.post("/providers/test")
async def test_provider(body: ProviderTestRequest, _admin: UserDB = Depends(get_current_admin)):
    """Test a provider connection without saving."""
    if body.provider == "ollama" and not body.value.startswith(("http://", "https://")):
        raise HTTPException(status_code=400, detail="Ollama URL must start with http:// or https://")

    if body.provider == "openai":
        from openai import AsyncOpenAI, AuthenticationError
        try:
            client = AsyncOpenAI(api_key=body.value)
            await client.models.list()
            return {"ok": True, "message": "OpenAI connection successful."}
        except AuthenticationError:
            return {"ok": False, "message": "Invalid API key."}
        except Exception as e:
            return {"ok": False, "message": f"Connection failed: {e}"}

    elif body.provider == "ollama":
        import httpx
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{body.value.rstrip('/')}/api/tags")
                response.raise_for_status()
                models = response.json().get("models", [])
                names = [m.get("name", "") for m in models]
                msg = f"Ollama reachable. {len(names)} model(s) installed: {', '.join(names) or 'none'}."
                return {"ok": True, "message": msg}
        except Exception as e:
            return {"ok": False, "message": f"Cannot reach Ollama at {body.value}: {e}"}

    raise HTTPException(status_code=400, detail=f"Unknown provider: {body.provider}")
