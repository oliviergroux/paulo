from fastapi import APIRouter, Depends
import os

from lifecycle_copilot.config import object_storage_configured
from lifecycle_copilot.dependencies import require_admin
from lifecycle_copilot.modules.chat.router import router as chat_router
from lifecycle_copilot.modules.datasets.router import router as datasets_router
from lifecycle_copilot.modules.dictionary.router import router as dictionary_router
from lifecycle_copilot.modules.documents.router import router as documents_router
from lifecycle_copilot.modules.insights.router import router as insights_router
from lifecycle_copilot.modules.mapping.router import router as mapping_router
from lifecycle_copilot.modules.profiling.router import router as profiling_router
from lifecycle_copilot.modules.projects.router import router as projects_router

router = APIRouter()
router.include_router(projects_router)
router.include_router(dictionary_router)
router.include_router(datasets_router)
router.include_router(profiling_router)
router.include_router(mapping_router)
router.include_router(insights_router)
router.include_router(documents_router)
router.include_router(chat_router)


@router.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "product": "lifecycle-copilot",
        "version": "v1",
        "object_storage_configured": object_storage_configured(),
    }


@router.get("/meta")
def meta(_admin=Depends(require_admin)) -> dict:
    return {
        "product": "Lifecycle Copilot",
        "api_version": "v1",
        "modules": {
            "projects": "ready",
            "dictionary": "ready",
            "datasets": "ready",
            "profiling": "ready",
            "mcd": "ready",
            "mapping": "ready",
            "quality": "ready",
            "insights": "ready",
            "documents": "ready",
            "chat": "ready",
        },
        "import_formats": ["csv", "xlsx", "pdf"],
        "object_storage_configured": object_storage_configured(),
        "openai_configured": bool((os.getenv("OPENAI_API_KEY") or "").strip()),
    }
