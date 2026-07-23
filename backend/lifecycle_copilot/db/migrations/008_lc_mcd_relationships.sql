-- Lifecycle Copilot — manual MCD relationships

CREATE TABLE IF NOT EXISTS lc_mcd_relationships (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES lc_projects(id) ON DELETE CASCADE,
    from_table VARCHAR(128) NOT NULL,
    from_column VARCHAR(128),
    to_table VARCHAR(128) NOT NULL,
    to_column VARCHAR(128),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lc_mcd_relationships_project
ON lc_mcd_relationships (project_id, created_at ASC);
