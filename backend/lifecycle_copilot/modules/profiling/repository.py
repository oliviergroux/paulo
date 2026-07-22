from typing import Any, Optional

from psycopg2.extras import Json, RealDictCursor

from db import get_db_connection


def _row_to_profile(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": row["id"],
        "dataset_column_id": row["dataset_column_id"],
        "column_name": row.get("column_name"),
        "total_rows": row["total_rows"],
        "null_count": row["null_count"],
        "distinct_count": row["distinct_count"],
        "sample_values": row.get("sample_values") or [],
        "min_value": row.get("min_value"),
        "max_value": row.get("max_value"),
        "computed_at": row["computed_at"].isoformat() if row.get("computed_at") else None,
    }


def upsert_profiles(dataset_id: int, profiles: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not profiles:
        return []

    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            for profile in profiles:
                cur.execute(
                    """
                    INSERT INTO lc_column_profiles (
                        dataset_column_id, total_rows, null_count, distinct_count,
                        sample_values, min_value, max_value, computed_at
                    )
                    VALUES (%s, %s, %s, %s, %s::jsonb, %s, %s, NOW())
                    ON CONFLICT (dataset_column_id) DO UPDATE SET
                        total_rows = EXCLUDED.total_rows,
                        null_count = EXCLUDED.null_count,
                        distinct_count = EXCLUDED.distinct_count,
                        sample_values = EXCLUDED.sample_values,
                        min_value = EXCLUDED.min_value,
                        max_value = EXCLUDED.max_value,
                        computed_at = NOW()
                    """,
                    (
                        profile["dataset_column_id"],
                        profile["total_rows"],
                        profile["null_count"],
                        profile["distinct_count"],
                        Json(profile["sample_values"]),
                        profile.get("min_value"),
                        profile.get("max_value"),
                    ),
                )

            cur.execute(
                """
                SELECT p.id, p.dataset_column_id, c.name AS column_name,
                       p.total_rows, p.null_count, p.distinct_count,
                       p.sample_values, p.min_value, p.max_value, p.computed_at
                FROM lc_column_profiles p
                JOIN lc_dataset_columns c ON c.id = p.dataset_column_id
                WHERE c.dataset_id = %s
                ORDER BY c.position, c.name
                """,
                (dataset_id,),
            )
            rows = cur.fetchall()
        conn.commit()

    return [_row_to_profile(row) for row in rows]


def list_profiles(dataset_id: int) -> list[dict[str, Any]]:
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT p.id, p.dataset_column_id, c.name AS column_name,
                       p.total_rows, p.null_count, p.distinct_count,
                       p.sample_values, p.min_value, p.max_value, p.computed_at
                FROM lc_column_profiles p
                JOIN lc_dataset_columns c ON c.id = p.dataset_column_id
                WHERE c.dataset_id = %s
                ORDER BY c.position, c.name
                """,
                (dataset_id,),
            )
            rows = cur.fetchall()
    return [_row_to_profile(row) for row in rows]
