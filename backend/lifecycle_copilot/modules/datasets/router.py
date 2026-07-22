from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile

from lifecycle_copilot.dependencies import require_admin
from lifecycle_copilot.modules.datasets import service
from lifecycle_copilot.modules.datasets.schemas import DatasetDetail, DatasetImportResult, DatasetSummary

router = APIRouter(
    prefix="/projects/{project_id}/datasets",
    tags=["lifecycle-copilot-datasets"],
)


@router.get("", response_model=list[DatasetSummary])
def list_datasets(
    project_id: int,
    _admin=Depends(require_admin),
) -> list[DatasetSummary]:
    return service.list_datasets(project_id)


@router.get("/{dataset_id}", response_model=DatasetDetail)
def get_dataset(
    project_id: int,
    dataset_id: int,
    _admin=Depends(require_admin),
) -> DatasetDetail:
    return service.get_dataset(project_id, dataset_id)


@router.post("/import", response_model=DatasetImportResult, status_code=201)
async def import_dataset(
    project_id: int,
    file: UploadFile = File(...),
    name: str = Form(default=""),
    _admin=Depends(require_admin),
) -> DatasetImportResult:
    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="empty_file")

    filename = file.filename or "dataset.csv"
    try:
        return service.import_dataset_file(project_id, name, filename, raw)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.delete("/{dataset_id}", status_code=204)
def delete_dataset(
    project_id: int,
    dataset_id: int,
    _admin=Depends(require_admin),
) -> Response:
    service.delete_dataset(project_id, dataset_id)
    return Response(status_code=204)
