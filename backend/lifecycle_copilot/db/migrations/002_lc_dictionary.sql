-- Lifecycle Copilot — dictionary (PR2)

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
);

CREATE INDEX IF NOT EXISTS idx_lc_dictionary_project
ON lc_dictionary_entries (project_id, table_name, column_name);
