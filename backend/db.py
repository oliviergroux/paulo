import os

import psycopg2


def get_db_connection():
    return psycopg2.connect(os.getenv("DATABASE_URL"), sslmode="require")


def ensure_schema():
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                ALTER TABLE requests
                ADD COLUMN IF NOT EXISTS assigned_service VARCHAR(64)
                """
            )
        conn.commit()
