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
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS communes (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(128) NOT NULL,
                    postal_code VARCHAR(10) NOT NULL,
                    department VARCHAR(64),
                    is_active BOOLEAN NOT NULL DEFAULT true,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
            cur.execute(
                """
                ALTER TABLE partners
                ADD COLUMN IF NOT EXISTS commune_id INTEGER REFERENCES communes(id)
                """
            )
            cur.execute(
                """
                ALTER TABLE requests
                ADD COLUMN IF NOT EXISTS commune_id INTEGER REFERENCES communes(id)
                """
            )
            cur.execute(
                """
                INSERT INTO communes (name, postal_code, department, is_active)
                SELECT 'Commune pilote', '00000', NULL, true
                WHERE NOT EXISTS (SELECT 1 FROM communes)
                """
            )
            cur.execute(
                """
                UPDATE partners
                SET commune_id = (SELECT id FROM communes ORDER BY id ASC LIMIT 1)
                WHERE commune_id IS NULL
                """
            )
            cur.execute(
                """
                UPDATE requests
                SET commune_id = (SELECT id FROM communes ORDER BY id ASC LIMIT 1)
                WHERE commune_id IS NULL
                """
            )
        conn.commit()
