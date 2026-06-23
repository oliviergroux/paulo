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
                    department_code VARCHAR(5),
                    department_label VARCHAR(128),
                    email VARCHAR(255),
                    phone VARCHAR(32),
                    insee_code VARCHAR(5),
                    latitude DOUBLE PRECISION,
                    longitude DOUBLE PRECISION,
                    is_active BOOLEAN NOT NULL DEFAULT true,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
            cur.execute(
                """
                ALTER TABLE communes
                ADD COLUMN IF NOT EXISTS department_code VARCHAR(5)
                """
            )
            cur.execute(
                """
                ALTER TABLE communes
                ADD COLUMN IF NOT EXISTS department_label VARCHAR(128)
                """
            )
            cur.execute(
                """
                ALTER TABLE communes
                ADD COLUMN IF NOT EXISTS email VARCHAR(255)
                """
            )
            cur.execute(
                """
                ALTER TABLE communes
                ADD COLUMN IF NOT EXISTS phone VARCHAR(32)
                """
            )
            cur.execute(
                """
                ALTER TABLE communes
                ADD COLUMN IF NOT EXISTS insee_code VARCHAR(5)
                """
            )
            cur.execute(
                """
                ALTER TABLE communes
                ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION
                """
            )
            cur.execute(
                """
                ALTER TABLE communes
                ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION
                """
            )
            cur.execute(
                """
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1
                        FROM information_schema.columns
                        WHERE table_name = 'communes'
                          AND column_name = 'department'
                    ) THEN
                        UPDATE communes
                        SET department_label = department
                        WHERE department IS NOT NULL
                          AND department_label IS NULL;
                        ALTER TABLE communes DROP COLUMN department;
                    END IF;
                END $$;
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
                INSERT INTO communes (name, postal_code, is_active)
                SELECT 'Commune pilote', '00000', true
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
