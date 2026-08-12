#!/usr/bin/env python3
"""Drop all Lifecycle Copilot tables (lc_*) from Neon. Requires DATABASE_URL."""

import os
import sys
from pathlib import Path

import psycopg2

MIGRATION = Path(__file__).resolve().parent.parent / "migrations" / "009_drop_lc_tables.sql"


def main() -> int:
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("DATABASE_URL is not set.", file=sys.stderr)
        return 1

    sql = MIGRATION.read_text(encoding="utf-8")
    with psycopg2.connect(database_url, sslmode="require") as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT tablename
                FROM pg_tables
                WHERE schemaname = 'public'
                  AND tablename LIKE 'lc\\_%' ESCAPE '\\'
                ORDER BY tablename
                """
            )
            before = [row[0] for row in cur.fetchall()]
            cur.execute(sql)
        conn.commit()

    with psycopg2.connect(database_url, sslmode="require") as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT tablename
                FROM pg_tables
                WHERE schemaname = 'public'
                  AND tablename LIKE 'lc\\_%' ESCAPE '\\'
                ORDER BY tablename
                """
            )
            after = [row[0] for row in cur.fetchall()]

    if before:
        print("Dropped tables:", ", ".join(before))
    else:
        print("No lc_* tables found.")
    if after:
        print("Remaining lc_* tables:", ", ".join(after), file=sys.stderr)
        return 1
    print("Done.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
