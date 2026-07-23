from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile

from lifecycle_copilot.dependencies import require_admin
from lifecycle_copilot.modules.dictionary import mcd, mcd_relationships, service
from lifecycle_copilot.modules.dictionary.schemas import (
    DictionaryEntry,
    DictionaryImportResult,
    DictionaryTableSummary,
    McdGraph,
    McdRelationship,
    McdRelationshipCreate,
)

router = APIRouter(
    prefix="/projects/{project_id}/dictionary",
    tags=["lifecycle-copilot-dictionary"],
)


@router.get("", response_model=list[DictionaryEntry])
def list_dictionary_entries(
    project_id: int,
    table_name: str | None = None,
    _admin=Depends(require_admin),
) -> list[DictionaryEntry]:
    return service.list_entries(project_id, table_name)


@router.get("/tables", response_model=list[DictionaryTableSummary])
def list_dictionary_tables(
    project_id: int,
    _admin=Depends(require_admin),
) -> list[DictionaryTableSummary]:
    return service.list_tables(project_id)


@router.get("/mcd", response_model=McdGraph)
def get_dictionary_mcd(
    project_id: int,
    _admin=Depends(require_admin),
) -> McdGraph:
    return mcd.build_mcd(project_id)


@router.post("/mcd/relationships", response_model=McdRelationship, status_code=201)
def create_mcd_relationship(
    project_id: int,
    payload: McdRelationshipCreate,
    _admin=Depends(require_admin),
) -> McdRelationship:
    return mcd_relationships.create_manual_relationship(
        project_id,
        payload.model_dump(),
    )


@router.delete("/mcd/relationships/{relationship_id}", status_code=204)
def delete_mcd_relationship(
    project_id: int,
    relationship_id: int,
    _admin=Depends(require_admin),
) -> Response:
    mcd_relationships.delete_manual_relationship(project_id, relationship_id)
    return Response(status_code=204)


@router.post("/import", response_model=DictionaryImportResult)
async def import_dictionary(
    project_id: int,
    file: UploadFile = File(...),
    _admin=Depends(require_admin),
) -> DictionaryImportResult:
    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="empty_file")

    filename = file.filename or "dictionary.csv"
    try:
        return service.import_dictionary_file(project_id, filename, raw)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
