import os
import re
from typing import Optional

from psycopg2.extras import RealDictCursor

from db import get_db_connection

DEFAULT_COMMUNE_ID = os.getenv("DEFAULT_COMMUNE_ID")


def extract_postal_code(text: str) -> Optional[str]:
    if not text:
        return None
    match = re.search(r"\b(\d{5})\b", text)
    return match.group(1) if match else None


def get_commune_by_id(commune_id: int):
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT
                    id,
                    name,
                    postal_code,
                    department_code,
                    department_label,
                    is_active,
                    created_at
                FROM communes
                WHERE id = %s
                """,
                (commune_id,),
            )
            return cur.fetchone()


def get_active_commune_by_postal_code(postal_code: str):
    if not postal_code:
        return None

    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT
                    id,
                    name,
                    postal_code,
                    department_code,
                    department_label,
                    is_active,
                    created_at
                FROM communes
                WHERE postal_code = %s AND is_active = true
                ORDER BY id ASC
                LIMIT 1
                """,
                (postal_code.strip(),),
            )
            return cur.fetchone()


def get_default_commune_id() -> Optional[int]:
    if DEFAULT_COMMUNE_ID:
        try:
            commune_id = int(DEFAULT_COMMUNE_ID)
            commune = get_commune_by_id(commune_id)
            if commune and commune["is_active"]:
                return commune_id
        except ValueError:
            pass

    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id
                FROM communes
                WHERE is_active = true
                ORDER BY id ASC
                LIMIT 1
                """
            )
            row = cur.fetchone()

    return row["id"] if row else None


def resolve_commune_id_for_request(client_address: Optional[str] = None) -> Optional[int]:
    postal_code = extract_postal_code(client_address or "")
    if postal_code:
        commune = get_active_commune_by_postal_code(postal_code)
        if commune:
            return commune["id"]

    return get_default_commune_id()


def normalize_phone_digits(phone: str) -> str:
    if not phone:
        return ""
    cleaned = re.sub(r"[^\d+]", "", phone.strip())
    if cleaned.startswith("whatsapp:"):
        cleaned = cleaned.replace("whatsapp:", "")
    if cleaned.startswith("+33"):
        cleaned = "0" + cleaned[3:]
    elif cleaned.startswith("33") and len(cleaned) >= 11:
        cleaned = "0" + cleaned[2:]
    return cleaned


def resolve_commune_id_from_inbound_phone(inbound_to: Optional[str]) -> Optional[int]:
    """Resolve commune from the Twilio number that received the call/message."""
    digits = normalize_phone_digits(inbound_to or "")
    if not digits:
        return None

    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id
                FROM communes
                WHERE is_active = true
                  AND phone IS NOT NULL
                  AND regexp_replace(phone, '[^0-9]', '', 'g') = %s
                ORDER BY id ASC
                LIMIT 1
                """,
                (re.sub(r"\D", "", digits),),
            )
            row = cur.fetchone()

    return row["id"] if row else None


def resolve_commune_id_for_partner(address: str) -> Optional[int]:
    postal_code = extract_postal_code(address)
    if postal_code:
        commune = get_active_commune_by_postal_code(postal_code)
        if commune:
            return commune["id"]

    return get_default_commune_id()
