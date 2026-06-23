import os
import secrets
from typing import Optional

from fastapi import Header, HTTPException
from psycopg2.extras import RealDictCursor

from db import get_db_connection

ADMIN_API_KEY = os.getenv("ADMIN_API_KEY", "")


def require_admin(x_admin_key: Optional[str] = Header(default=None, alias="X-Admin-Key")):
    if not ADMIN_API_KEY:
        raise HTTPException(status_code=503, detail="admin_api_key_not_configured")

    if not x_admin_key or not secrets.compare_digest(x_admin_key, ADMIN_API_KEY):
        raise HTTPException(status_code=401, detail="unauthorized")


def is_valid_admin_key(key: Optional[str]) -> bool:
    if not ADMIN_API_KEY or not key:
        return False
    return secrets.compare_digest(key, ADMIN_API_KEY)


def verify_partner_token(partner_id: int, token: Optional[str]) -> bool:
    if not token:
        return False

    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT access_token FROM partners WHERE id = %s",
                (partner_id,),
            )
            row = cur.fetchone()

    if not row:
        return False

    return secrets.compare_digest(row["access_token"], token)


def partner_can_update_request(
    partner_id: int, token: Optional[str], request_id: int
) -> bool:
    if not verify_partner_token(partner_id, token):
        return False

    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT assigned_partner_id
                FROM requests
                WHERE id = %s
                """,
                (request_id,),
            )
            row = cur.fetchone()

    if not row:
        return False

    return row["assigned_partner_id"] == partner_id


def parse_commune_id_header(
    x_commune_id: Optional[str] = Header(default=None, alias="X-Commune-Id"),
) -> Optional[int]:
    if not x_commune_id:
        return None

    try:
        commune_id = int(x_commune_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="invalid_commune_id") from exc

    return commune_id
