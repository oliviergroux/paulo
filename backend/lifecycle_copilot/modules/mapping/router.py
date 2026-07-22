from fastapi import APIRouter, Depends

from lifecycle_copilot.dependencies import require_admin
from lifecycle_copilot.modules.mapping import service
from lifecycle_copilot.modules.mapping.schemas import MappingRunResult, MappingSummary

router = APIRouter(
    prefix="/projects/{project_id}/mapping",
    tags=["lifecycle-copilot-mapping"],
)


@router.get("", response_model=MappingSummary)
def get_mapping(
    project_id: int,
    _admin=Depends(require_admin),
) -> MappingSummary:
    return service.get_mapping_summary(project_id)


@router.post("/run", response_model=MappingRunResult)
def run_mapping(
    project_id: int,
    _admin=Depends(require_admin),
) -> MappingRunResult:
    return service.run_mapping(project_id)
