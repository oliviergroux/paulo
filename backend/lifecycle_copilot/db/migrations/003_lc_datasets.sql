-- Lifecycle Copilot — datasets (PR3)

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
);

CREATE INDEX IF NOT EXISTS idx_lc_datasets_project
ON lc_datasets (project_id, imported_at DESC);

CREATE TABLE IF NOT EXISTS lc_dataset_columns (
    id SERIAL PRIMARY KEY,
    dataset_id INTEGER NOT NULL REFERENCES lc_datasets(id) ON DELETE CASCADE,
    name VARCHAR(128) NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    inferred_type VARCHAR(64),
    dictionary_entry_id INTEGER REFERENCES lc_dictionary_entries(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (dataset_id, name)
);
