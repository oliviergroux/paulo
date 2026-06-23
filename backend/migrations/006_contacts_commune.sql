ALTER TABLE clients
ADD COLUMN IF NOT EXISTS commune_id INTEGER REFERENCES communes(id);

UPDATE clients c
SET commune_id = sub.commune_id
FROM (
    SELECT DISTINCT ON (r.client_id)
        r.client_id,
        r.commune_id
    FROM requests r
    WHERE r.client_id IS NOT NULL
      AND r.commune_id IS NOT NULL
    ORDER BY r.client_id, r.created_at DESC
) sub
WHERE c.id = sub.client_id
  AND c.commune_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_clients_commune_id ON clients(commune_id);
