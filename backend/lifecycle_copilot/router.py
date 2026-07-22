from fastapi import APIRouter, Depends

from lifecycle_copilot.config import object_storage_configured
from lifecycle_copilot.dependencies import require_admin
from lifecycle_copilot.modules.projects.router import router as projects_router

router = APIRouter()
router.include_router(projects_router)


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
            "projects": "skeleton",
            "dictionary": "planned",
            "datasets": "planned",
            "profiling": "planned",
        },
        "import_formats": ["csv", "xlsx"],
        "object_storage_configured": object_storage_configured(),
    }
