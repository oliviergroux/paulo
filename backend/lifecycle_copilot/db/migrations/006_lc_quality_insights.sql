-- Lifecycle Copilot — quality + insights (PR6-PR8)

CREATE TABLE IF NOT EXISTS lc_quality_reports (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES lc_projects(id) ON DELETE CASCADE,
    overall_score INTEGER NOT NULL DEFAULT 0,
    alert_count INTEGER NOT NULL DEFAULT 0,
    alerts JSONB NOT NULL DEFAULT '[]'::jsonb,
    summary TEXT,
    computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lc_quality_reports_project
ON lc_quality_reports (project_id, computed_at DESC);

CREATE TABLE IF NOT EXISTS lc_insight_reports (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES lc_projects(id) ON DELETE CASCADE,
    report_kind VARCHAR(32) NOT NULL,
    content_markdown TEXT NOT NULL DEFAULT '',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lc_insight_reports_project
ON lc_insight_reports (project_id, report_kind, created_at DESC);
