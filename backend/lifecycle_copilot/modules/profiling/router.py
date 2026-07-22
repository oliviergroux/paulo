from fastapi import APIRouter, Depends

from lifecycle_copilot.dependencies import require_admin
from lifecycle_copilot.modules.profiling import service
from lifecycle_copilot.modules.profiling.schemas import ColumnProfile

router = APIRouter(
    prefix="/projects/{project_id}/datasets/{dataset_id}/profiles",
    tags=["lifecycle-copilot-profiling"],
)


@router.get("", response_model=list[ColumnProfile])
def list_profiles(
    project_id: int,
    dataset_id: int,
    _admin=Depends(require_admin),
) -> list[ColumnProfile]:
    return service.list_profiles(project_id, dataset_id)


@router.post("", response_model=list[ColumnProfile])
def compute_profiles(
    project_id: int,
    dataset_id: int,
    _admin=Depends(require_admin),
) -> list[ColumnProfile]:
    return service.compute_profiles(project_id, dataset_id)
