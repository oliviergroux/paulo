from fastapi import APIRouter, Depends

from lifecycle_copilot.dependencies import require_admin
from lifecycle_copilot.modules.insights import service as insights_service
from lifecycle_copilot.modules.quality import service as quality_service
from lifecycle_copilot.modules.quality.schemas import (
    QualityReport,
    RecommendationsReport,
    SynthesisReport,
)

router = APIRouter(
    prefix="/projects/{project_id}",
    tags=["lifecycle-copilot-quality-insights"],
)


@router.get("/quality", response_model=QualityReport)
def get_quality(
    project_id: int,
    _admin=Depends(require_admin),
) -> QualityReport:
    report = quality_service.get_latest_quality(project_id)
    if not report:
        report = quality_service.compute_quality(project_id)
    return report


@router.post("/quality/compute", response_model=QualityReport)
def compute_quality(
    project_id: int,
    _admin=Depends(require_admin),
) -> QualityReport:
    return quality_service.compute_quality(project_id)


@router.get("/insights/recommendations", response_model=RecommendationsReport)
def get_recommendations(
    project_id: int,
    _admin=Depends(require_admin),
) -> RecommendationsReport:
    report = quality_service.get_latest_insight(project_id, "recommendations")
    if report:
        return report
    return quality_service.build_recommendations(project_id)


@router.post("/insights/recommendations", response_model=RecommendationsReport)
def build_recommendations(
    project_id: int,
    _admin=Depends(require_admin),
) -> RecommendationsReport:
    return quality_service.build_recommendations(project_id)


@router.get("/insights/synthesis", response_model=SynthesisReport)
def get_synthesis(
    project_id: int,
    _admin=Depends(require_admin),
) -> SynthesisReport:
    report = quality_service.get_latest_insight(project_id, "synthesis")
    if report:
        return {
            "content_markdown": report.get("content_markdown", ""),
            "generated_by": report.get("generated_by", "rules"),
            "created_at": report.get("created_at"),
        }
    return insights_service.generate_synthesis(project_id)


@router.post("/insights/synthesis", response_model=SynthesisReport)
def generate_synthesis(
    project_id: int,
    _admin=Depends(require_admin),
) -> SynthesisReport:
    return insights_service.generate_synthesis(project_id)
