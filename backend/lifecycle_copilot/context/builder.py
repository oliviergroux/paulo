import json
from typing import Any

from lifecycle_copilot.modules.datasets import repository as datasets_repository
from lifecycle_copilot.modules.dictionary import mcd as mcd_builder
from lifecycle_copilot.modules.mapping import service as mapping_service
from lifecycle_copilot.modules.projects.repository import get_project, require_project
from lifecycle_copilot.modules.quality import service as quality_service


def build_project_context(project_id: int, max_alerts: int = 8) -> dict[str, Any]:
    require_project(project_id)
    project = get_project(project_id) or {}
    mapping = mapping_service.get_mapping_summary(project_id)
    quality = quality_service.get_latest_quality(project_id)
    mcd = mcd_builder.build_mcd(project_id)
    datasets = datasets_repository.list_datasets(project_id)

    return {
        "project": {
            "name": project.get("name"),
            "client_name": project.get("client_name"),
            "crm_platform": project.get("crm_platform"),
            "description": project.get("description"),
        },
        "datasets": [
            {
                "name": item["name"],
                "rows": item["row_count"],
                "columns": item["column_count"],
            }
            for item in datasets
        ],
        "mcd": {
            "tables": mcd["table_count"],
            "relationships": mcd["relationship_count"],
        },
        "mapping": {
            "coverage_percent": mapping["coverage_percent"],
            "mapped_columns": mapping["mapped_columns"],
            "unmapped_columns": mapping["unmapped_columns"],
        },
        "quality": {
            "overall_score": quality["overall_score"] if quality else None,
            "summary": quality["summary"] if quality else None,
            "top_alerts": (quality or {}).get("alerts", [])[:max_alerts],
        },
    }


def project_context_text(project_id: int) -> str:
    return json.dumps(build_project_context(project_id), ensure_ascii=False, indent=2)
