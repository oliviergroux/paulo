from typing import Any, Optional

from fastapi import HTTPException
from psycopg2.extras import RealDictCursor

from db import get_db_connection


def _row_to_project(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": row["id"],
        "name": row["name"],
        "client_name": row.get("client_name"),
        "crm_platform": row.get("crm_platform"),
        "description": row.get("description"),
        "status": row["status"],
        "created_at": row["created_at"].isoformat() if row.get("created_at") else None,
        "updated_at": row["updated_at"].isoformat() if row.get("updated_at") else None,
    }


def list_projects() -> list[dict[str, Any]]:
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, name, client_name, crm_platform, description, status,
                       created_at, updated_at
                FROM lc_projects
                ORDER BY created_at DESC
                """
            )
            rows = cur.fetchall()
    return [_row_to_project(row) for row in rows]


def get_project(project_id: int) -> Optional[dict[str, Any]]:
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, name, client_name, crm_platform, description, status,
                       created_at, updated_at
                FROM lc_projects
                WHERE id = %s
                """,
                (project_id,),
            )
            row = cur.fetchone()
    return _row_to_project(row) if row else None


def require_project(project_id: int) -> dict[str, Any]:
    project = get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="project_not_found")
    return project


def create_project(payload: dict[str, Any]) -> dict[str, Any]:
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO lc_projects (name, client_name, crm_platform, description, status)
                VALUES (%s, %s, %s, %s, 'draft')
                RETURNING id, name, client_name, crm_platform, description, status,
                          created_at, updated_at
                """,
                (
                    payload["name"],
                    payload.get("client_name"),
                    payload.get("crm_platform"),
                    payload.get("description"),
                ),
            )
            row = cur.fetchone()
        conn.commit()
    return _row_to_project(row)


def update_project(project_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    fields = []
    values: list[Any] = []

    for key in ("name", "client_name", "crm_platform", "description", "status"):
        if key in payload and payload[key] is not None:
            fields.append(f"{key} = %s")
            values.append(payload[key])

    if not fields:
        return require_project(project_id)

    fields.append("updated_at = NOW()")
    values.append(project_id)

    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                f"""
                UPDATE lc_projects
                SET {", ".join(fields)}
                WHERE id = %s
                RETURNING id, name, client_name, crm_platform, description, status,
                          created_at, updated_at
                """,
                values,
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="project_not_found")
        conn.commit()
    return _row_to_project(row)


def delete_project(project_id: int) -> None:
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM lc_projects WHERE id = %s", (project_id,))
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="project_not_found")
        conn.commit()
