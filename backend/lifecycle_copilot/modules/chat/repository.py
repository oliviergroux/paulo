from typing import Any, Optional

from psycopg2.extras import Json, RealDictCursor

from db import get_db_connection
from lifecycle_copilot.modules.projects.repository import require_project


def list_messages(project_id: int, limit: int = 50) -> list[dict[str, Any]]:
    require_project(project_id)
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, project_id, role, content, citations, created_at
                FROM lc_chat_messages
                WHERE project_id = %s
                ORDER BY created_at ASC
                LIMIT %s
                """,
                (project_id, limit),
            )
            rows = cur.fetchall()
    return [
        {
            "id": row["id"],
            "project_id": row["project_id"],
            "role": row["role"],
            "content": row["content"],
            "citations": row.get("citations") or [],
            "created_at": row["created_at"].isoformat() if row.get("created_at") else None,
        }
        for row in rows
    ]


def add_message(
    project_id: int,
    role: str,
    content: str,
    citations: Optional[list[dict[str, Any]]] = None,
) -> dict[str, Any]:
    require_project(project_id)
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO lc_chat_messages (project_id, role, content, citations)
                VALUES (%s, %s, %s, %s::jsonb)
                RETURNING id, project_id, role, content, citations, created_at
                """,
                (project_id, role, content, Json(citations or [])),
            )
            row = cur.fetchone()
        conn.commit()
    return {
        "id": row["id"],
        "project_id": row["project_id"],
        "role": row["role"],
        "content": row["content"],
        "citations": row.get("citations") or [],
        "created_at": row["created_at"].isoformat() if row.get("created_at") else None,
    }


def clear_messages(project_id: int) -> None:
    require_project(project_id)
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM lc_chat_messages WHERE project_id = %s", (project_id,))
        conn.commit()
