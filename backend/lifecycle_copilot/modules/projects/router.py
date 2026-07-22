from fastapi import APIRouter, Depends

from lifecycle_copilot.config import object_storage_configured
from lifecycle_copilot.dependencies import require_admin
from lifecycle_copilot.modules.projects.schemas import ProjectCreate, ProjectSummary

router = APIRouter(prefix="/projects", tags=["lifecycle-copilot-projects"])


@router.get("")
def list_projects(_admin=Depends(require_admin)) -> list[ProjectSummary]:
    return []


@router.post("")
def create_project(
    _payload: ProjectCreate,
    _admin=Depends(require_admin),
) -> dict:
    return {
        "ok": False,
        "error": "not_implemented",
        "detail": "Project creation arrives in PR1.",
    }


@router.get("/meta")
def projects_meta(_admin=Depends(require_admin)) -> dict:
    return {
        "object_storage_configured": object_storage_configured(),
        "supported_import_formats": ["csv", "xlsx"],
    }
