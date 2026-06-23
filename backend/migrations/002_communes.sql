CREATE TABLE IF NOT EXISTS communes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    postal_code VARCHAR(10) NOT NULL,
    department VARCHAR(64),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE partners
ADD COLUMN IF NOT EXISTS commune_id INTEGER REFERENCES communes(id);

ALTER TABLE requests
ADD COLUMN IF NOT EXISTS commune_id INTEGER REFERENCES communes(id);

INSERT INTO communes (name, postal_code, department, is_active)
SELECT 'Commune pilote', '00000', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM communes);

UPDATE partners
SET commune_id = (SELECT id FROM communes ORDER BY id ASC LIMIT 1)
WHERE commune_id IS NULL;

UPDATE requests
SET commune_id = (SELECT id FROM communes ORDER BY id ASC LIMIT 1)
WHERE commune_id IS NULL;
