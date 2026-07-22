from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile

from lifecycle_copilot.dependencies import require_admin
from lifecycle_copilot.modules.documents import service
from lifecycle_copilot.modules.documents.schemas import (
    DocumentAnalysis,
    DocumentImportResult,
    DocumentSummary,
)

router = APIRouter(
    prefix="/projects/{project_id}/documents",
    tags=["lifecycle-copilot-documents"],
)


@router.get("", response_model=list[DocumentSummary])
def list_documents(
    project_id: int,
    _admin=Depends(require_admin),
) -> list[DocumentSummary]:
    return service.list_documents(project_id)


@router.post("/import", response_model=DocumentImportResult, status_code=201)
async def import_document(
    project_id: int,
    file: UploadFile = File(...),
    name: str = Form(default=""),
    doc_type: str = Form(default="appel_offre"),
    _admin=Depends(require_admin),
) -> DocumentImportResult:
    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="empty_file")
    filename = file.filename or "document.pdf"
    try:
        return service.import_pdf_document(project_id, name, filename, doc_type, raw)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/{document_id}/analysis", response_model=DocumentAnalysis)
def get_document_analysis(
    project_id: int,
    document_id: int,
    _admin=Depends(require_admin),
) -> DocumentAnalysis:
    return service.get_document_analysis(project_id, document_id)


@router.post("/{document_id}/analyze", response_model=DocumentAnalysis)
def analyze_document(
    project_id: int,
    document_id: int,
    _admin=Depends(require_admin),
) -> DocumentAnalysis:
    return service.analyze_document(project_id, document_id)


@router.delete("/{document_id}", status_code=204)
def delete_document(
    project_id: int,
    document_id: int,
    _admin=Depends(require_admin),
) -> Response:
    service.delete_document(project_id, document_id)
    return Response(status_code=204)
