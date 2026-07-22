from typing import Any, Optional

from fastapi import HTTPException
from psycopg2.extras import Json, RealDictCursor

from db import get_db_connection
from lifecycle_copilot.modules.projects.repository import require_project


def _row_to_document(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": row["id"],
        "project_id": row["project_id"],
        "name": row["name"],
        "file_name": row["file_name"],
        "doc_type": row["doc_type"],
        "page_count": row["page_count"],
        "char_count": row["char_count"],
        "chunk_count": row.get("chunk_count") or 0,
        "file_size_bytes": row["file_size_bytes"],
        "status": row["status"],
        "storage_key": row.get("storage_key"),
        "uploaded_at": row["uploaded_at"].isoformat() if row.get("uploaded_at") else None,
        "analyzed_at": row["analyzed_at"].isoformat() if row.get("analyzed_at") else None,
    }


def list_documents(project_id: int) -> list[dict[str, Any]]:
    require_project(project_id)
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT d.id, d.project_id, d.name, d.file_name, d.doc_type,
                       d.page_count, d.char_count, d.file_size_bytes, d.status,
                       d.storage_key, d.uploaded_at,
                       (SELECT COUNT(*) FROM lc_document_chunks c WHERE c.document_id = d.id) AS chunk_count,
                       (SELECT MAX(a.analyzed_at) FROM lc_document_analyses a WHERE a.document_id = d.id) AS analyzed_at
                FROM lc_documents d
                WHERE d.project_id = %s
                ORDER BY d.uploaded_at DESC
                """,
                (project_id,),
            )
            rows = cur.fetchall()
    return [_row_to_document(row) for row in rows]


def get_document(project_id: int, document_id: int) -> dict[str, Any]:
    require_project(project_id)
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT d.id, d.project_id, d.name, d.file_name, d.doc_type,
                       d.page_count, d.char_count, d.file_size_bytes, d.status,
                       d.storage_key, d.uploaded_at, d.raw_file,
                       (SELECT COUNT(*) FROM lc_document_chunks c WHERE c.document_id = d.id) AS chunk_count,
                       (SELECT MAX(a.analyzed_at) FROM lc_document_analyses a WHERE a.document_id = d.id) AS analyzed_at
                FROM lc_documents d
                WHERE d.id = %s AND d.project_id = %s
                """,
                (document_id, project_id),
            )
            row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="document_not_found")
    return row


def get_document_bytes(project_id: int, document_id: int) -> bytes:
    row = get_document(project_id, document_id)
    if row.get("raw_file"):
        return bytes(row["raw_file"])
    storage_key = row.get("storage_key")
    if not storage_key:
        raise HTTPException(status_code=404, detail="document_file_not_available")
    from lifecycle_copilot.storage.client import download_bytes

    return download_bytes(storage_key)


def create_document(
    project_id: int,
    name: str,
    file_name: str,
    doc_type: str,
    raw: bytes,
    storage_key: Optional[str],
    page_count: int,
    char_count: int,
    status: str = "ready",
) -> dict[str, Any]:
    require_project(project_id)
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO lc_documents (
                    project_id, name, file_name, doc_type, storage_key, raw_file,
                    page_count, char_count, file_size_bytes, status
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id, project_id, name, file_name, doc_type, page_count, char_count,
                          file_size_bytes, status, storage_key, uploaded_at
                """,
                (
                    project_id,
                    name,
                    file_name,
                    doc_type,
                    storage_key,
                    None if storage_key else raw,
                    page_count,
                    char_count,
                    len(raw),
                    status,
                ),
            )
            row = cur.fetchone()
        conn.commit()
    document = _row_to_document(row)
    document["chunk_count"] = 0
    document["analyzed_at"] = None
    return document


def replace_chunks(document_id: int, chunks: list[dict[str, Any]]) -> None:
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM lc_document_chunks WHERE document_id = %s", (document_id,))
            for chunk in chunks:
                cur.execute(
                    """
                    INSERT INTO lc_document_chunks (
                        document_id, chunk_index, page_start, page_end, content, embedding
                    )
                    VALUES (%s, %s, %s, %s, %s, %s::jsonb)
                    """,
                    (
                        document_id,
                        chunk["chunk_index"],
                        chunk["page_start"],
                        chunk["page_end"],
                        chunk["content"],
                        Json(chunk.get("embedding") or []),
                    ),
                )
        conn.commit()


def list_chunks_for_project(project_id: int) -> list[dict[str, Any]]:
    require_project(project_id)
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT c.id, c.document_id, c.chunk_index, c.page_start, c.page_end,
                       c.content, c.embedding, d.name AS document_name, d.file_name
                FROM lc_document_chunks c
                JOIN lc_documents d ON d.id = c.document_id
                WHERE d.project_id = %s
                ORDER BY c.document_id, c.chunk_index
                """,
                (project_id,),
            )
            rows = cur.fetchall()
    return [dict(row) for row in rows]


def list_chunks_for_document(document_id: int) -> list[dict[str, Any]]:
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, document_id, chunk_index, page_start, page_end, content, embedding
                FROM lc_document_chunks
                WHERE document_id = %s
                ORDER BY chunk_index
                """,
                (document_id,),
            )
            rows = cur.fetchall()
    return [dict(row) for row in rows]


def save_analysis(document_id: int, analysis: dict[str, Any]) -> dict[str, Any]:
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO lc_document_analyses (
                    document_id, summary, requirements, gaps, recommendations
                )
                VALUES (%s, %s, %s::jsonb, %s::jsonb, %s::jsonb)
                RETURNING id, document_id, summary, requirements, gaps, recommendations, analyzed_at
                """,
                (
                    document_id,
                    analysis.get("summary"),
                    Json(analysis.get("requirements") or []),
                    Json(analysis.get("gaps") or []),
                    Json(analysis.get("recommendations") or []),
                ),
            )
            row = cur.fetchone()
        conn.commit()
    return {
        "id": row["id"],
        "document_id": row["document_id"],
        "summary": row["summary"],
        "requirements": row["requirements"] or [],
        "gaps": row["gaps"] or [],
        "recommendations": row["recommendations"] or [],
        "analyzed_at": row["analyzed_at"].isoformat() if row.get("analyzed_at") else None,
    }


def get_latest_analysis(document_id: int) -> Optional[dict[str, Any]]:
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, document_id, summary, requirements, gaps, recommendations, analyzed_at
                FROM lc_document_analyses
                WHERE document_id = %s
                ORDER BY analyzed_at DESC
                LIMIT 1
                """,
                (document_id,),
            )
            row = cur.fetchone()
    if not row:
        return None
    return {
        "id": row["id"],
        "document_id": row["document_id"],
        "summary": row["summary"],
        "requirements": row["requirements"] or [],
        "gaps": row["gaps"] or [],
        "recommendations": row["recommendations"] or [],
        "analyzed_at": row["analyzed_at"].isoformat() if row.get("analyzed_at") else None,
    }


def delete_document(project_id: int, document_id: int) -> None:
    row = get_document(project_id, document_id)
    storage_key = row.get("storage_key")
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM lc_documents WHERE id = %s AND project_id = %s",
                (document_id, project_id),
            )
        conn.commit()
    if storage_key:
        from lifecycle_copilot.storage.client import delete_object

        delete_object(storage_key)
