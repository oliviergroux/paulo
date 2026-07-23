from typing import Any, Optional

from fastapi import HTTPException
from psycopg2.extras import RealDictCursor

from db import get_db_connection
from lifecycle_copilot.modules.projects.repository import require_project


def _row_to_relationship(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": row["id"],
        "project_id": row["project_id"],
        "from_table": row["from_table"],
        "from_column": row.get("from_column") or None,
        "to_table": row["to_table"],
        "to_column": row.get("to_column") or None,
        "source": "manual",
    }


def list_manual_relationships(project_id: int) -> list[dict[str, Any]]:
    require_project(project_id)
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, project_id, from_table, from_column, to_table, to_column, created_at
                FROM lc_mcd_relationships
                WHERE project_id = %s
                ORDER BY created_at ASC, id ASC
                """,
                (project_id,),
            )
            rows = cur.fetchall()
    return [_row_to_relationship(row) for row in rows]


def create_manual_relationship(project_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    require_project(project_id)
    from_table = (payload.get("from_table") or "").strip()
    to_table = (payload.get("to_table") or "").strip()
    if not from_table or not to_table:
        raise HTTPException(status_code=400, detail="missing_tables")
    if from_table == to_table:
        raise HTTPException(status_code=400, detail="same_table")

    from_column = (payload.get("from_column") or "").strip() or None
    to_column = (payload.get("to_column") or "").strip() or None

    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO lc_mcd_relationships (
                    project_id, from_table, from_column, to_table, to_column
                )
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id, project_id, from_table, from_column, to_table, to_column
                """,
                (project_id, from_table, from_column, to_table, to_column),
            )
            row = cur.fetchone()
        conn.commit()
    return _row_to_relationship(row)


def delete_manual_relationship(project_id: int, relationship_id: int) -> None:
    require_project(project_id)
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                DELETE FROM lc_mcd_relationships
                WHERE id = %s AND project_id = %s
                """,
                (relationship_id, project_id),
            )
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="relationship_not_found")
        conn.commit()
