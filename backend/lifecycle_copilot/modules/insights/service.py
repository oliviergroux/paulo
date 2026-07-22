import json
import os
from typing import Any, Optional

from openai import OpenAI

from lifecycle_copilot.modules.dictionary import mcd as mcd_builder
from lifecycle_copilot.modules.dictionary import repository as dictionary_repository
from lifecycle_copilot.modules.datasets import repository as datasets_repository
from lifecycle_copilot.modules.mapping import service as mapping_service
from lifecycle_copilot.modules.projects.repository import get_project, require_project
from lifecycle_copilot.modules.quality import service as quality_service


def _get_client() -> Optional[OpenAI]:
    api_key = (os.getenv("OPENAI_API_KEY") or "").strip()
    if not api_key:
        return None
    return OpenAI(api_key=api_key)


def _build_context(project_id: int) -> dict[str, Any]:
    project = get_project(project_id)
    mapping = mapping_service.get_mapping_summary(project_id)
    quality = quality_service.get_latest_quality(project_id) or quality_service.compute_quality(project_id)
    mcd = mcd_builder.build_mcd(project_id)
    datasets = datasets_repository.list_datasets(project_id)
    dictionary_count = len(dictionary_repository.list_entries(project_id))

    return {
        "project": project,
        "dictionary_entries": dictionary_count,
        "datasets": [
            {
                "name": item["name"],
                "rows": item["row_count"],
                "columns": item["column_count"],
            }
            for item in datasets
        ],
        "mapping_coverage_percent": mapping["coverage_percent"],
        "quality_score": quality["overall_score"],
        "top_alerts": quality["alerts"][:12],
        "mcd": {
            "tables": mcd["table_count"],
            "relationships": mcd["relationship_count"],
        },
    }


def generate_synthesis(project_id: int) -> dict[str, Any]:
    require_project(project_id)
    context = _build_context(project_id)
    client = _get_client()

    fallback = _fallback_synthesis(context)
    if not client:
        payload = {
            "content_markdown": fallback,
            "generated_by": "rules",
            "context": context,
        }
        quality_service._save_insight(project_id, "synthesis", payload)
        return payload

    prompt = f"""
Tu es un consultant CRM senior. Rédige une synthèse d'audit lifecycle en français, en markdown,
à partir de ce contexte JSON :

{json.dumps(context, ensure_ascii=False)}

Structure attendue :
1. Contexte projet
2. État du modèle de données (MCD / dictionnaire)
3. Qualité des exports (score, alertes majeures)
4. Écarts doc ↔ données
5. Priorités d'action sur 30 jours

Ton : concis, actionnable, orienté consultant. Pas de blabla.
"""
    try:
        result = client.responses.create(model="gpt-4o-mini", input=prompt)
        content = (result.output_text or fallback).strip()
    except Exception:
        content = fallback

    payload = {
        "content_markdown": content,
        "generated_by": "openai",
        "context": context,
    }
    quality_service._save_insight(project_id, "synthesis", payload)
    return payload


def _fallback_synthesis(context: dict[str, Any]) -> str:
    project = context.get("project") or {}
    lines = [
        f"# Synthèse Lifecycle — {project.get('name', 'Projet')}",
        "",
        "## Contexte",
        f"- Client : {project.get('client_name') or 'non renseigné'}",
        f"- CRM : {project.get('crm_platform') or 'non renseigné'}",
        f"- Entrées dictionnaire : {context.get('dictionary_entries', 0)}",
        f"- Datasets importés : {len(context.get('datasets', []))}",
        "",
        "## Qualité des données",
        f"- Score global : **{context.get('quality_score', 'N/A')}/100**",
        f"- Couverture mapping doc ↔ exports : **{context.get('mapping_coverage_percent', 0)}%**",
        "",
        "## Alertes principales",
    ]
    for alert in context.get("top_alerts", [])[:8]:
        lines.append(f"- [{alert.get('severity')}] {alert.get('message')}")
    lines.extend(
        [
            "",
            "## Priorités recommandées",
            "1. Documenter les colonnes non mappées.",
            "2. Corriger les champs clés avec trop de nulls.",
            "3. Valider le MCD avec le métier avant refonte lifecycle.",
        ]
    )
    return "\n".join(lines)
