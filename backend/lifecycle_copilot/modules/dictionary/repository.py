from typing import Any, Optional

from fastapi import HTTPException
from psycopg2.extras import RealDictCursor

from db import get_db_connection
from lifecycle_copilot.modules.projects.repository import require_project


def _row_to_entry(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": row["id"],
        "project_id": row["project_id"],
        "table_name": row["table_name"],
        "column_name": row["column_name"],
        "data_type": row.get("data_type"),
        "description": row.get("description"),
        "is_primary_key": bool(row.get("is_primary_key")),
        "is_foreign_key": bool(row.get("is_foreign_key")),
        "foreign_table": row.get("foreign_table"),
        "foreign_column": row.get("foreign_column"),
        "source_file_name": row.get("source_file_name"),
        "source_row_number": row.get("source_row_number"),
    }


def list_entries(project_id: int, table_name: Optional[str] = None) -> list[dict[str, Any]]:
    require_project(project_id)
    query = """
        SELECT id, project_id, table_name, column_name, data_type, description,
               is_primary_key, is_foreign_key, foreign_table, foreign_column,
               source_file_name, source_row_number
        FROM lc_dictionary_entries
        WHERE project_id = %s
    """
    params: list[Any] = [project_id]
    if table_name:
        query += " AND table_name = %s"
        params.append(table_name)
    query += " ORDER BY table_name, column_name"

    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, params)
            rows = cur.fetchall()
    return [_row_to_entry(row) for row in rows]


def list_tables(project_id: int) -> list[dict[str, Any]]:
    require_project(project_id)
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT table_name, COUNT(*) AS column_count
                FROM lc_dictionary_entries
                WHERE project_id = %s
                GROUP BY table_name
                ORDER BY table_name
                """,
                (project_id,),
            )
            rows = cur.fetchall()
    return [
        {"table_name": row["table_name"], "column_count": row["column_count"]}
        for row in rows
    ]


def replace_entries(
    project_id: int,
    entries: list[dict[str, Any]],
    source_file_name: str,
) -> dict[str, Any]:
    require_project(project_id)

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM lc_dictionary_entries WHERE project_id = %s",
                (project_id,),
            )
            for index, entry in enumerate(entries, start=2):
                cur.execute(
                    """
                    INSERT INTO lc_dictionary_entries (
                        project_id, table_name, column_name, data_type, description,
                        is_primary_key, is_foreign_key, foreign_table, foreign_column,
                        source_file_name, source_row_number
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        project_id,
                        entry["table_name"],
                        entry["column_name"],
                        entry.get("data_type"),
                        entry.get("description"),
                        entry.get("is_primary_key", False),
                        entry.get("is_foreign_key", False),
                        entry.get("foreign_table"),
                        entry.get("foreign_column"),
                        source_file_name,
                        index,
                    ),
                )
        conn.commit()

    tables = list_tables(project_id)
    return {
        "imported_rows": len(entries),
        "table_count": len(tables),
        "column_count": len(entries),
        "source_file_name": source_file_name,
    }
