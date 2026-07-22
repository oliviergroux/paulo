from typing import Any, Optional

from psycopg2.extras import Json, RealDictCursor

from db import get_db_connection
from lifecycle_copilot.modules.datasets import repository as datasets_repository
from lifecycle_copilot.modules.dictionary import repository as dictionary_repository
from lifecycle_copilot.modules.mapping import service as mapping_service
from lifecycle_copilot.modules.profiling import repository as profiling_repository
from lifecycle_copilot.modules.projects.repository import get_project, require_project


def _types_compatible(inferred: Optional[str], documented: Optional[str]) -> bool:
    if not inferred or not documented:
        return True
    inferred_norm = inferred.lower()
    documented_norm = documented.lower()
    if inferred_norm == documented_norm:
        return True
    numeric = {"integer", "float", "number", "decimal", "numeric"}
    text = {"string", "text", "varchar", "char"}
    dates = {"date", "datetime", "timestamp"}
    if inferred_norm in numeric and documented_norm in numeric:
        return True
    if inferred_norm in text and documented_norm in text:
        return True
    if inferred_norm in dates and documented_norm in dates:
        return True
    return False


def _severity_for_null_ratio(ratio: float) -> Optional[str]:
    if ratio >= 0.9:
        return "critical"
    if ratio >= 0.5:
        return "warning"
    return None


def compute_quality(project_id: int) -> dict[str, Any]:
    require_project(project_id)
    mapping = mapping_service.get_mapping_summary(project_id)
    datasets = datasets_repository.list_datasets(project_id)
    dictionary_entries = dictionary_repository.list_entries(project_id)

    alerts: list[dict[str, Any]] = []
    score = 100

    for dataset in datasets:
        dataset_id = dataset["id"]
        columns = datasets_repository.get_dataset_columns(dataset_id)
        profiles = profiling_repository.list_profiles(dataset_id)
        profile_by_column_id = {profile["dataset_column_id"]: profile for profile in profiles}
        matches_by_column_id = {
            match["dataset_column_id"]: match for match in mapping["matches"]
        }

        for column in columns:
            profile = profile_by_column_id.get(column["id"])
            match = matches_by_column_id.get(column["id"])
            null_ratio = 0.0
            if profile and profile["total_rows"] > 0:
                null_ratio = profile["null_count"] / profile["total_rows"]

            severity = _severity_for_null_ratio(null_ratio)
            if severity:
                score -= 8 if severity == "critical" else 4
                alerts.append(
                    {
                        "severity": severity,
                        "code": "high_null_rate",
                        "dataset_id": dataset_id,
                        "dataset_name": dataset["name"],
                        "column_name": column["name"],
                        "message": f"{column['name']} : {round(null_ratio * 100, 1)}% de valeurs nulles",
                    }
                )

            if profile and profile["total_rows"] > 0:
                if profile["distinct_count"] <= 1:
                    score -= 2
                    alerts.append(
                        {
                            "severity": "info",
                            "code": "constant_column",
                            "dataset_id": dataset_id,
                            "dataset_name": dataset["name"],
                            "column_name": column["name"],
                            "message": f"{column['name']} semble constante ou vide (lifecycle / hygiène CRM)",
                        }
                    )
                if "id" in column["name"].lower() and profile["distinct_count"] < max(2, profile["total_rows"] * 0.5):
                    score -= 5
                    alerts.append(
                        {
                            "severity": "warning",
                            "code": "weak_identifier",
                            "dataset_id": dataset_id,
                            "dataset_name": dataset["name"],
                            "column_name": column["name"],
                            "message": f"{column['name']} a peu de valeurs distinctes pour un identifiant",
                        }
                    )

            if match and not match.get("dictionary_entry_id"):
                score -= 3
                alerts.append(
                    {
                        "severity": "warning",
                        "code": "undocumented_column",
                        "dataset_id": dataset_id,
                        "dataset_name": dataset["name"],
                        "column_name": column["name"],
                        "message": f"{column['name']} n'est pas documentée dans le dictionnaire",
                    }
                )
            elif match and match.get("dictionary_entry_id"):
                entry = next(
                    (
                        item
                        for item in dictionary_entries
                        if item["id"] == match["dictionary_entry_id"]
                    ),
                    None,
                )
                if entry and not _types_compatible(column.get("inferred_type"), entry.get("data_type")):
                    score -= 4
                    alerts.append(
                        {
                            "severity": "warning",
                            "code": "type_mismatch",
                            "dataset_id": dataset_id,
                            "dataset_name": dataset["name"],
                            "column_name": column["name"],
                            "message": (
                                f"{column['name']} : type inféré {column.get('inferred_type')} "
                                f"≠ dictionnaire {entry.get('data_type')}"
                            ),
                        }
                    )
                if entry and entry.get("is_primary_key") and null_ratio > 0:
                    score -= 6
                    alerts.append(
                        {
                            "severity": "critical",
                            "code": "missing_primary_key_values",
                            "dataset_id": dataset_id,
                            "dataset_name": dataset["name"],
                            "column_name": column["name"],
                            "message": f"Clé primaire {column['name']} contient des valeurs nulles",
                        }
                    )

    for gap in mapping["gaps"]["missing_in_exports"][:20]:
        score -= 1
        alerts.append(
            {
                "severity": "info",
                "code": "missing_in_export",
                "dataset_id": None,
                "dataset_name": None,
                "column_name": gap["column_name"],
                "message": (
                    f"Colonne documentée {gap['table_name']}.{gap['column_name']} "
                    "absente des exports analysés"
                ),
            }
        )

    score = max(0, min(100, score))
    summary = (
        f"Score qualité {score}/100 · {len(alerts)} alertes · "
        f"{mapping['coverage_percent']}% de colonnes mappées"
    )

    report = {
        "overall_score": score,
        "alert_count": len(alerts),
        "alerts": alerts,
        "summary": summary,
        "mapping_coverage_percent": mapping["coverage_percent"],
    }
    _save_report(project_id, report)
    return report


def _save_report(project_id: int, report: dict[str, Any]) -> None:
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM lc_quality_reports WHERE project_id = %s", (project_id,))
            cur.execute(
                """
                INSERT INTO lc_quality_reports (
                    project_id, overall_score, alert_count, alerts, summary
                )
                VALUES (%s, %s, %s, %s::jsonb, %s)
                """,
                (
                    project_id,
                    report["overall_score"],
                    report["alert_count"],
                    Json(report["alerts"]),
                    report["summary"],
                ),
            )
        conn.commit()


def get_latest_quality(project_id: int) -> Optional[dict[str, Any]]:
    require_project(project_id)
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT overall_score, alert_count, alerts, summary, computed_at
                FROM lc_quality_reports
                WHERE project_id = %s
                ORDER BY computed_at DESC
                LIMIT 1
                """,
                (project_id,),
            )
            row = cur.fetchone()
    if not row:
        return None
    return {
        "overall_score": row["overall_score"],
        "alert_count": row["alert_count"],
        "alerts": row["alerts"] or [],
        "summary": row["summary"],
        "mapping_coverage_percent": None,
        "computed_at": row["computed_at"].isoformat() if row.get("computed_at") else None,
    }


def build_recommendations(project_id: int) -> dict[str, Any]:
    quality = get_latest_quality(project_id) or compute_quality(project_id)
    project = get_project(project_id)
    if not project:
        require_project(project_id)
        project = get_project(project_id)

    recommendations: list[dict[str, Any]] = []
    for alert in quality["alerts"]:
        if alert["code"] == "constant_column":
            recommendations.append(
                {
                    "category": "lifecycle",
                    "priority": "medium",
                    "title": "Champ probablement inutilisé",
                    "detail": alert["message"],
                    "action": "Vérifier si le champ peut être retiré du parcours lifecycle ou enrichi.",
                }
            )
        elif alert["code"] == "high_null_rate":
            recommendations.append(
                {
                    "category": "hygiene",
                    "priority": "high" if alert["severity"] == "critical" else "medium",
                    "title": "Complétude insuffisante",
                    "detail": alert["message"],
                    "action": "Renforcer la collecte ou assouplir la règle métier sur ce champ.",
                }
            )
        elif alert["code"] == "undocumented_column":
            recommendations.append(
                {
                    "category": "governance",
                    "priority": "medium",
                    "title": "Documenter la colonne",
                    "detail": alert["message"],
                    "action": "Ajouter la colonne au dictionnaire de données CRM.",
                }
            )
        elif alert["code"] == "missing_in_export":
            recommendations.append(
                {
                    "category": "coverage",
                    "priority": "low",
                    "title": "Écart doc / export",
                    "detail": alert["message"],
                    "action": "Confirmer si la colonne est obsolète ou absente des exports.",
                }
            )

    segmentation_candidates: list[str] = []
    for dataset in datasets_repository.list_datasets(project_id):
        for column in datasets_repository.get_dataset_columns(dataset["id"]):
            name = column["name"].lower()
            if any(token in name for token in ("segment", "stage", "lifecycle", "status", "statut")):
                segmentation_candidates.append(f"{dataset['name']}.{column['name']}")

    if segmentation_candidates:
        recommendations.append(
            {
                "category": "segmentation",
                "priority": "high",
                "title": "Leviers de segmentation lifecycle",
                "detail": "Champs candidats : " + ", ".join(segmentation_candidates[:8]),
                "action": "Analyser la distribution et construire des segments lifecycle actionnables.",
            }
        )

    deduped: list[dict[str, Any]] = []
    seen_titles: set[str] = set()
    for item in recommendations:
        if item["title"] in seen_titles:
            continue
        seen_titles.add(item["title"])
        deduped.append(item)

    payload = {
        "project_name": project["name"] if project else "",
        "recommendation_count": len(deduped),
        "recommendations": deduped[:30],
    }
    _save_insight(project_id, "recommendations", payload)
    return payload


def _save_insight(project_id: int, kind: str, payload: dict[str, Any]) -> None:
    content = payload.get("content_markdown") or ""
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO lc_insight_reports (project_id, report_kind, content_markdown, metadata)
                VALUES (%s, %s, %s, %s::jsonb)
                """,
                (project_id, kind, content, Json(payload)),
            )
        conn.commit()


def get_latest_insight(project_id: int, kind: str) -> Optional[dict[str, Any]]:
    require_project(project_id)
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT report_kind, content_markdown, metadata, created_at
                FROM lc_insight_reports
                WHERE project_id = %s AND report_kind = %s
                ORDER BY created_at DESC
                LIMIT 1
                """,
                (project_id, kind),
            )
            row = cur.fetchone()
    if not row:
        return None
    metadata = row["metadata"] or {}
    if row.get("content_markdown"):
        metadata["content_markdown"] = row["content_markdown"]
    metadata["created_at"] = row["created_at"].isoformat() if row.get("created_at") else None
    return metadata
