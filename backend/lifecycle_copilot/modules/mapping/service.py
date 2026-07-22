from typing import Any, Optional

from psycopg2.extras import RealDictCursor

from db import get_db_connection
from lifecycle_copilot.modules.datasets import repository as datasets_repository
from lifecycle_copilot.modules.dictionary import repository as dictionary_repository
from lifecycle_copilot.modules.mapping.matcher import pick_best_matches
from lifecycle_copilot.modules.projects.repository import require_project


def _get_columns_with_dataset(project_id: int, dataset_id: Optional[int] = None):
    require_project(project_id)
    query = """
        SELECT c.id, c.dataset_id, c.name, c.position, c.inferred_type,
               c.dictionary_entry_id, c.mapping_confidence, c.mapping_method,
               d.name AS dataset_name, d.file_name,
               e.table_name AS dictionary_table_name,
               e.column_name AS dictionary_column_name
        FROM lc_dataset_columns c
        JOIN lc_datasets d ON d.id = c.dataset_id
        LEFT JOIN lc_dictionary_entries e ON e.id = c.dictionary_entry_id
        WHERE d.project_id = %s
    """
    params: list[Any] = [project_id]
    if dataset_id is not None:
        query += " AND c.dataset_id = %s"
        params.append(dataset_id)
    query += " ORDER BY d.imported_at DESC, c.position, c.name"

    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, params)
            return cur.fetchall()


def _persist_matches(matches: list[dict[str, Any]]) -> None:
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            for match in matches:
                cur.execute(
                    """
                    UPDATE lc_dataset_columns
                    SET dictionary_entry_id = %s,
                        mapping_confidence = %s,
                        mapping_method = %s
                    WHERE id = %s
                    """,
                    (
                        match["dictionary_entry_id"],
                        match["confidence"],
                        match["method"],
                        match["dataset_column_id"],
                    ),
                )
        conn.commit()


def run_mapping(project_id: int, dataset_id: Optional[int] = None) -> dict[str, Any]:
    dictionary_entries = dictionary_repository.list_entries(project_id)
    rows = _get_columns_with_dataset(project_id, dataset_id)
    if not rows:
        return {
            "mapped_columns": 0,
            "unmapped_columns": 0,
            "total_columns": 0,
            "datasets_processed": 0,
            "matches": [],
        }

    grouped: dict[int, list[dict[str, Any]]] = {}
    dataset_meta: dict[int, dict[str, str]] = {}
    for row in rows:
        grouped.setdefault(row["dataset_id"], []).append(
            {"id": row["id"], "name": row["name"]}
        )
        dataset_meta[row["dataset_id"]] = {
            "dataset_name": row["dataset_name"],
            "file_name": row["file_name"],
        }

    all_matches: list[dict[str, Any]] = []
    mapped_count = 0

    for current_dataset_id, columns in grouped.items():
        meta = dataset_meta[current_dataset_id]
        matches = pick_best_matches(
            columns,
            dictionary_entries,
            meta["dataset_name"],
            meta["file_name"],
        )
        for match in matches:
            match["dataset_id"] = current_dataset_id
            match["dictionary_table_name"] = match.get("dictionary_table_name")
            match["dictionary_column_name"] = match.get("dictionary_column_name")
            if match["dictionary_entry_id"]:
                mapped_count += 1
        all_matches.extend(matches)

    _persist_matches(all_matches)

    return {
        "mapped_columns": mapped_count,
        "unmapped_columns": len(all_matches) - mapped_count,
        "total_columns": len(all_matches),
        "datasets_processed": len(grouped),
        "matches": all_matches,
    }


def get_mapping_summary(project_id: int) -> dict[str, Any]:
    rows = _get_columns_with_dataset(project_id)
    dictionary_entries = dictionary_repository.list_entries(project_id)
    mapped = [row for row in rows if row.get("dictionary_entry_id")]
    unmapped = [row for row in rows if not row.get("dictionary_entry_id")]

    mapped_entry_ids = {row["dictionary_entry_id"] for row in mapped}
    missing_dictionary = [
        entry
        for entry in dictionary_entries
        if entry["id"] not in mapped_entry_ids
    ]

    return {
        "total_columns": len(rows),
        "mapped_columns": len(mapped),
        "unmapped_columns": len(unmapped),
        "coverage_percent": round((len(mapped) / len(rows)) * 100, 1) if rows else 0,
        "missing_dictionary_columns": len(missing_dictionary),
        "matches": [
            {
                "dataset_id": row["dataset_id"],
                "dataset_column_id": row["id"],
                "dataset_column_name": row["name"],
                "dictionary_entry_id": row.get("dictionary_entry_id"),
                "dictionary_table_name": row.get("dictionary_table_name"),
                "dictionary_column_name": row.get("dictionary_column_name"),
                "confidence": float(row["mapping_confidence"])
                if row.get("mapping_confidence") is not None
                else None,
                "method": row.get("mapping_method"),
            }
            for row in rows
        ],
        "gaps": {
            "undocumented_columns": [
                {"dataset_id": row["dataset_id"], "column_name": row["name"]}
                for row in unmapped
            ],
            "missing_in_exports": [
                {
                    "table_name": entry["table_name"],
                    "column_name": entry["column_name"],
                }
                for entry in missing_dictionary[:100]
            ],
        },
    }
