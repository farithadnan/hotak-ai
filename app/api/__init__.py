"""API package exports."""

from fastapi import APIRouter

from .admin import router as admin_router
from .auth import router as auth_router
from .chats import router as chats_router
from .documents import router as documents_router
from .models import router as models_router
from .query import router as query_router
from .templates import router as templates_router

router = APIRouter()
router.include_router(auth_router)
router.include_router(admin_router)
router.include_router(templates_router)
router.include_router(documents_router)
router.include_router(query_router)
router.include_router(chats_router)
router.include_router(models_router)

__all__ = [
	"router"
]
