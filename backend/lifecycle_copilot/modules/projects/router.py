from fastapi import APIRouter, Depends, Response

from lifecycle_copilot.config import object_storage_configured
from lifecycle_copilot.dependencies import require_admin
from lifecycle_copilot.modules.projects import service
from lifecycle_copilot.modules.projects.schemas import (
    ProjectCreate,
    ProjectDetail,
    ProjectSummary,
    ProjectUpdate,
)

router = APIRouter(prefix="/projects", tags=["lifecycle-copilot-projects"])


@router.get("", response_model=list[ProjectSummary])
def list_projects(_admin=Depends(require_admin)) -> list[ProjectSummary]:
    return service.list_projects()


@router.post("", response_model=ProjectDetail, status_code=201)
def create_project(
    payload: ProjectCreate,
    _admin=Depends(require_admin),
) -> ProjectDetail:
    return service.create_project(payload.model_dump())


@router.get("/meta")
def projects_meta(_admin=Depends(require_admin)) -> dict:
    return {
        "object_storage_configured": object_storage_configured(),
        "supported_import_formats": ["csv", "xlsx"],
    }


@router.get("/{project_id}", response_model=ProjectDetail)
def get_project(project_id: int, _admin=Depends(require_admin)) -> ProjectDetail:
    return service.get_project(project_id)


@router.patch("/{project_id}", response_model=ProjectDetail)
def update_project(
    project_id: int,
    payload: ProjectUpdate,
    _admin=Depends(require_admin),
) -> ProjectDetail:
    return service.update_project(
        project_id,
        payload.model_dump(exclude_unset=True),
    )


@router.delete("/{project_id}", status_code=204)
def delete_project(
    project_id: int,
    _admin=Depends(require_admin),
) -> Response:
    service.delete_project(project_id)
    return Response(status_code=204)
