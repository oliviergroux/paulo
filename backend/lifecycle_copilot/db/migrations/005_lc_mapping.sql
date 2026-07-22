-- Lifecycle Copilot — column mapping metadata (PR6 mapping layer)

ALTER TABLE lc_dataset_columns ADD COLUMN IF NOT EXISTS mapping_confidence REAL;
ALTER TABLE lc_dataset_columns ADD COLUMN IF NOT EXISTS mapping_method VARCHAR(32);
