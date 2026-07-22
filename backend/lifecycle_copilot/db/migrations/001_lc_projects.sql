-- Lifecycle Copilot — run manually on Neon (PR1)
-- Prefix lc_ keeps Paulo tables isolated.

CREATE TABLE IF NOT EXISTS lc_projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    client_name VARCHAR(128),
    crm_platform VARCHAR(64),
    description TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lc_projects_created_at ON lc_projects (created_at DESC);
