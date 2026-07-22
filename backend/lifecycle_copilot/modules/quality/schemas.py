from typing import Any, Optional

from pydantic import BaseModel


class QualityAlert(BaseModel):
    severity: str
    code: str
    dataset_id: Optional[int] = None
    dataset_name: Optional[str] = None
    column_name: Optional[str] = None
    message: str


class QualityReport(BaseModel):
    overall_score: int
    alert_count: int
    alerts: list[QualityAlert] = []
    summary: str
    mapping_coverage_percent: Optional[float] = None
    computed_at: Optional[str] = None


class RecommendationItem(BaseModel):
    category: str
    priority: str
    title: str
    detail: str
    action: str


class RecommendationsReport(BaseModel):
    project_name: str = ""
    recommendation_count: int
    recommendations: list[RecommendationItem] = []
    created_at: Optional[str] = None


class SynthesisReport(BaseModel):
    content_markdown: str
    generated_by: str = "rules"
    created_at: Optional[str] = None
