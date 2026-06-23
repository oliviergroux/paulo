ALTER TABLE communes
ADD COLUMN IF NOT EXISTS department_code VARCHAR(5);

ALTER TABLE communes
ADD COLUMN IF NOT EXISTS department_label VARCHAR(128);

ALTER TABLE communes
ADD COLUMN IF NOT EXISTS email VARCHAR(255);

ALTER TABLE communes
ADD COLUMN IF NOT EXISTS phone VARCHAR(32);

UPDATE communes
SET department_label = department
WHERE department IS NOT NULL
  AND department_label IS NULL;

ALTER TABLE communes
DROP COLUMN IF EXISTS department;
