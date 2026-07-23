from db import get_db_connection


def ensure_lc_schema() -> None:
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS lc_projects (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(128) NOT NULL,
                    client_name VARCHAR(128),
                    crm_platform VARCHAR(64),
                    description TEXT,
                    status VARCHAR(32) NOT NULL DEFAULT 'draft',
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_lc_projects_created_at
                ON lc_projects (created_at DESC)
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS lc_dictionary_entries (
                    id SERIAL PRIMARY KEY,
                    project_id INTEGER NOT NULL REFERENCES lc_projects(id) ON DELETE CASCADE,
                    table_name VARCHAR(128) NOT NULL,
                    column_name VARCHAR(128) NOT NULL,
                    data_type VARCHAR(128),
                    description TEXT,
                    is_primary_key BOOLEAN NOT NULL DEFAULT false,
                    is_foreign_key BOOLEAN NOT NULL DEFAULT false,
                    foreign_table VARCHAR(128),
                    foreign_column VARCHAR(128),
                    source_file_name VARCHAR(255),
                    source_row_number INTEGER,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_lc_dictionary_project
                ON lc_dictionary_entries (project_id, table_name, column_name)
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS lc_datasets (
                    id SERIAL PRIMARY KEY,
                    project_id INTEGER NOT NULL REFERENCES lc_projects(id) ON DELETE CASCADE,
                    name VARCHAR(128) NOT NULL,
                    file_name VARCHAR(255) NOT NULL,
                    file_format VARCHAR(16) NOT NULL,
                    storage_key VARCHAR(512),
                    row_count INTEGER NOT NULL DEFAULT 0,
                    column_count INTEGER NOT NULL DEFAULT 0,
                    file_size_bytes BIGINT NOT NULL DEFAULT 0,
                    raw_file BYTEA,
                    status VARCHAR(32) NOT NULL DEFAULT 'imported',
                    imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
            cur.execute(
                """
                ALTER TABLE lc_datasets
                ADD COLUMN IF NOT EXISTS raw_file BYTEA
                """
            )
            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_lc_datasets_project
                ON lc_datasets (project_id, imported_at DESC)
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS lc_dataset_columns (
                    id SERIAL PRIMARY KEY,
                    dataset_id INTEGER NOT NULL REFERENCES lc_datasets(id) ON DELETE CASCADE,
                    name VARCHAR(128) NOT NULL,
                    position INTEGER NOT NULL DEFAULT 0,
                    inferred_type VARCHAR(64),
                    dictionary_entry_id INTEGER REFERENCES lc_dictionary_entries(id) ON DELETE SET NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    UNIQUE (dataset_id, name)
                )
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS lc_column_profiles (
                    id SERIAL PRIMARY KEY,
                    dataset_column_id INTEGER NOT NULL UNIQUE
                        REFERENCES lc_dataset_columns(id) ON DELETE CASCADE,
                    total_rows INTEGER NOT NULL DEFAULT 0,
                    null_count INTEGER NOT NULL DEFAULT 0,
                    distinct_count INTEGER NOT NULL DEFAULT 0,
                    sample_values JSONB NOT NULL DEFAULT '[]'::jsonb,
                    min_value TEXT,
                    max_value TEXT,
                    computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
            cur.execute(
                """
                ALTER TABLE lc_dataset_columns
                ADD COLUMN IF NOT EXISTS mapping_confidence REAL
                """
            )
            cur.execute(
                """
                ALTER TABLE lc_dataset_columns
                ADD COLUMN IF NOT EXISTS mapping_method VARCHAR(32)
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS lc_quality_reports (
                    id SERIAL PRIMARY KEY,
                    project_id INTEGER NOT NULL REFERENCES lc_projects(id) ON DELETE CASCADE,
                    overall_score INTEGER NOT NULL DEFAULT 0,
                    alert_count INTEGER NOT NULL DEFAULT 0,
                    alerts JSONB NOT NULL DEFAULT '[]'::jsonb,
                    summary TEXT,
                    computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_lc_quality_reports_project
                ON lc_quality_reports (project_id, computed_at DESC)
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS lc_insight_reports (
                    id SERIAL PRIMARY KEY,
                    project_id INTEGER NOT NULL REFERENCES lc_projects(id) ON DELETE CASCADE,
                    report_kind VARCHAR(32) NOT NULL,
                    content_markdown TEXT NOT NULL DEFAULT '',
                    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_lc_insight_reports_project
                ON lc_insight_reports (project_id, report_kind, created_at DESC)
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS lc_documents (
                    id SERIAL PRIMARY KEY,
                    project_id INTEGER NOT NULL REFERENCES lc_projects(id) ON DELETE CASCADE,
                    name VARCHAR(255) NOT NULL,
                    file_name VARCHAR(255) NOT NULL,
                    doc_type VARCHAR(64) NOT NULL DEFAULT 'appel_offre',
                    storage_key VARCHAR(512),
                    raw_file BYTEA,
                    page_count INTEGER NOT NULL DEFAULT 0,
                    char_count INTEGER NOT NULL DEFAULT 0,
                    file_size_bytes BIGINT NOT NULL DEFAULT 0,
                    status VARCHAR(32) NOT NULL DEFAULT 'ready',
                    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_lc_documents_project
                ON lc_documents (project_id, uploaded_at DESC)
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS lc_document_chunks (
                    id SERIAL PRIMARY KEY,
                    document_id INTEGER NOT NULL REFERENCES lc_documents(id) ON DELETE CASCADE,
                    chunk_index INTEGER NOT NULL DEFAULT 0,
                    page_start INTEGER NOT NULL DEFAULT 1,
                    page_end INTEGER NOT NULL DEFAULT 1,
                    content TEXT NOT NULL,
                    embedding JSONB NOT NULL DEFAULT '[]'::jsonb,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_lc_document_chunks_document
                ON lc_document_chunks (document_id, chunk_index)
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS lc_document_analyses (
                    id SERIAL PRIMARY KEY,
                    document_id INTEGER NOT NULL REFERENCES lc_documents(id) ON DELETE CASCADE,
                    summary TEXT,
                    requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
                    gaps JSONB NOT NULL DEFAULT '[]'::jsonb,
                    recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
                    analyzed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS lc_chat_messages (
                    id SERIAL PRIMARY KEY,
                    project_id INTEGER NOT NULL REFERENCES lc_projects(id) ON DELETE CASCADE,
                    role VARCHAR(16) NOT NULL,
                    content TEXT NOT NULL,
                    citations JSONB NOT NULL DEFAULT '[]'::jsonb,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_lc_chat_messages_project
                ON lc_chat_messages (project_id, created_at ASC)
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS lc_mcd_relationships (
                    id SERIAL PRIMARY KEY,
                    project_id INTEGER NOT NULL REFERENCES lc_projects(id) ON DELETE CASCADE,
                    from_table VARCHAR(128) NOT NULL,
                    from_column VARCHAR(128),
                    to_table VARCHAR(128) NOT NULL,
                    to_column VARCHAR(128),
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_lc_mcd_relationships_project
                ON lc_mcd_relationships (project_id, created_at ASC)
                """
            )
        conn.commit()
