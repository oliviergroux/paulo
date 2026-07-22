from typing import Any, Optional

from fastapi import HTTPException
from psycopg2.extras import RealDictCursor, execute_values

from db import get_db_connection
from lifecycle_copilot.modules.projects.repository import require_project


def _row_to_dataset(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": row["id"],
        "project_id": row["project_id"],
        "name": row["name"],
        "file_name": row["file_name"],
        "file_format": row["file_format"],
        "storage_key": row.get("storage_key"),
        "row_count": row["row_count"],
        "column_count": row["column_count"],
        "file_size_bytes": row["file_size_bytes"],
        "status": row["status"],
        "imported_at": row["imported_at"].isoformat() if row.get("imported_at") else None,
        "has_local_copy": bool(row.get("raw_file")),
    }


def _row_to_column(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": row["id"],
        "dataset_id": row["dataset_id"],
        "name": row["name"],
        "position": row["position"],
        "inferred_type": row.get("inferred_type"),
        "dictionary_entry_id": row.get("dictionary_entry_id"),
    }


def list_datasets(project_id: int) -> list[dict[str, Any]]:
    require_project(project_id)
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, project_id, name, file_name, file_format, storage_key,
                       row_count, column_count, file_size_bytes, status, imported_at,
                       (raw_file IS NOT NULL) AS raw_file
                FROM lc_datasets
                WHERE project_id = %s
                ORDER BY imported_at DESC
                """,
                (project_id,),
            )
            rows = cur.fetchall()
    return [_row_to_dataset(row) for row in rows]


def get_dataset(project_id: int, dataset_id: int) -> dict[str, Any]:
    require_project(project_id)
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, project_id, name, file_name, file_format, storage_key,
                       row_count, column_count, file_size_bytes, status, imported_at,
                       (raw_file IS NOT NULL) AS raw_file
                FROM lc_datasets
                WHERE id = %s AND project_id = %s
                """,
                (dataset_id, project_id),
            )
            row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="dataset_not_found")
    return _row_to_dataset(row)


def get_dataset_columns(dataset_id: int) -> list[dict[str, Any]]:
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, dataset_id, name, position, inferred_type, dictionary_entry_id
                FROM lc_dataset_columns
                WHERE dataset_id = %s
                ORDER BY position, name
                """,
                (dataset_id,),
            )
            rows = cur.fetchall()
    return [_row_to_column(row) for row in rows]


def get_dataset_file_bytes(project_id: int, dataset_id: int) -> tuple[bytes, str]:
    require_project(project_id)
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT file_name, raw_file, storage_key
                FROM lc_datasets
                WHERE id = %s AND project_id = %s
                """,
                (dataset_id, project_id),
            )
            row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="dataset_not_found")

    if row.get("raw_file"):
        return bytes(row["raw_file"]), row["file_name"]

    storage_key = row.get("storage_key")
    if not storage_key:
        raise HTTPException(status_code=404, detail="dataset_file_not_available")

    from lifecycle_copilot.storage.client import download_bytes

    return download_bytes(storage_key), row["file_name"]


def create_dataset(
    project_id: int,
    name: str,
    filename: str,
    file_format: str,
    raw: bytes,
    storage_key: Optional[str],
    headers: list[str],
    inferred_types: list[str],
    row_count: int,
) -> dict[str, Any]:
    require_project(project_id)

    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO lc_datasets (
                    project_id, name, file_name, file_format, storage_key, raw_file,
                    row_count, column_count, file_size_bytes, status
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'imported')
                RETURNING id, project_id, name, file_name, file_format, storage_key,
                          row_count, column_count, file_size_bytes, status, imported_at,
                          (raw_file IS NOT NULL) AS raw_file
                """,
                (
                    project_id,
                    name,
                    filename,
                    file_format,
                    storage_key,
                    None if storage_key else raw,
                    row_count,
                    len(headers),
                    len(raw),
                ),
            )
            dataset = cur.fetchone()
            dataset_id = dataset["id"]

            column_rows = [
                (dataset_id, header, index, inferred_types[index] if index < len(inferred_types) else "string")
                for index, header in enumerate(headers)
                if header
            ]
            if column_rows:
                execute_values(
                    cur,
                    """
                    INSERT INTO lc_dataset_columns (dataset_id, name, position, inferred_type)
                    VALUES %s
                    """,
                    column_rows,
                )
        conn.commit()

    return _row_to_dataset(dataset)


def delete_dataset(project_id: int, dataset_id: int) -> None:
    dataset = get_dataset(project_id, dataset_id)
    storage_key = dataset.get("storage_key")

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM lc_datasets WHERE id = %s AND project_id = %s",
                (dataset_id, project_id),
            )
        conn.commit()

    if storage_key:
        from lifecycle_copilot.storage.client import delete_object

        delete_object(storage_key)
