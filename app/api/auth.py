"""Auth API routes — login, current user, profile management."""

import json

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..db import get_db
from ..models.user import (
    ChangePassword,
    DEFAULT_PREFERENCES,
    TokenResponse,
    UpdatePreferences,
    UpdateProfile,
    UserDB,
    UserLogin,
    UserResponse,
)
from ..services.auth import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from ..utils.logger import setup_logger

logger = setup_logger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """Authenticate and return an access token."""
    user = db.query(UserDB).filter(UserDB.username == credentials.username).first()
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is locked. Contact an administrator.",
        )

    logger.info(f"User logged in: {user.username}")
    token = create_access_token({"sub": user.id})
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))


@router.get("/me", response_model=UserResponse)
def get_me(current_user: UserDB = Depends(get_current_user)):
    """Return the currently authenticated user's profile."""
    return UserResponse.model_validate(current_user)


@router.patch("/me", response_model=UserResponse)
def update_me(
    body: UpdateProfile,
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update the current user's username and/or email."""
    if body.username and body.username != current_user.username:
        if db.query(UserDB).filter(UserDB.username == body.username, UserDB.id != current_user.id).first():
            raise HTTPException(status_code=409, detail="Username already taken")
        current_user.username = body.username

    if body.email and body.email != current_user.email:
        if db.query(UserDB).filter(UserDB.email == body.email, UserDB.id != current_user.id).first():
            raise HTTPException(status_code=409, detail="Email already in use")
        current_user.email = body.email

    db.commit()
    db.refresh(current_user)
    logger.info("User %s updated their profile", current_user.username)
    return UserResponse.model_validate(current_user)


@router.post("/me/change-password", status_code=204)
def change_password(
    body: ChangePassword,
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Change the current user's password (requires current password verification)."""
    if not verify_password(body.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    current_user.hashed_password = hash_password(body.new_password)
    db.commit()
    logger.info("User %s changed their password", current_user.username)


@router.get("/me/preferences", response_model=dict)
def get_preferences(current_user: UserDB = Depends(get_current_user)):
    """Return the current user's preferences (with defaults applied)."""
    if not current_user.preferences:
        return DEFAULT_PREFERENCES.copy()
    try:
        prefs = json.loads(current_user.preferences)
        return {**DEFAULT_PREFERENCES, **prefs}
    except Exception:
        return DEFAULT_PREFERENCES.copy()


@router.patch("/me/preferences", response_model=dict)
def update_preferences(
    body: UpdatePreferences,
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Merge the supplied fields into the current user's preferences."""
    try:
        current = json.loads(current_user.preferences) if current_user.preferences else {}
    except Exception:
        current = {}

    updated = {**DEFAULT_PREFERENCES, **current}
    patch = body.model_dump(exclude_unset=True)
    updated.update(patch)

    current_user.preferences = json.dumps(updated)
    db.commit()
    return updated
