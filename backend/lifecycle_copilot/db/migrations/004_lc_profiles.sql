-- Lifecycle Copilot — column profiles (PR4)

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
);
