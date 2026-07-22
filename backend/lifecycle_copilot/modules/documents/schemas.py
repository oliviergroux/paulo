from typing import Any, Optional

from pydantic import BaseModel, Field


class DocumentSummary(BaseModel):
    id: int
    project_id: int
    name: str
    file_name: str
    doc_type: str
    page_count: int
    char_count: int
    chunk_count: int = 0
    file_size_bytes: int
    status: str
    uploaded_at: Optional[str] = None
    analyzed_at: Optional[str] = None


class DocumentImportResult(DocumentSummary):
    pass


class RequirementItem(BaseModel):
    id: str = ""
    title: str = ""
    page: str = ""
    detail: str = ""


class GapItem(BaseModel):
    requirement_id: str = ""
    severity: str = "medium"
    message: str = ""
    evidence: str = ""


class AoRecommendationItem(BaseModel):
    priority: str = "medium"
    title: str = ""
    action: str = ""
    rationale: str = ""


class DocumentAnalysis(BaseModel):
    id: int
    document_id: int
    summary: str = ""
    requirements: list[RequirementItem] = Field(default_factory=list)
    gaps: list[GapItem] = Field(default_factory=list)
    recommendations: list[AoRecommendationItem] = Field(default_factory=list)
    analyzed_at: Optional[str] = None
