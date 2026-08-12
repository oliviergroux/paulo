-- Rename category service_local → artisan (partners and requests).

UPDATE partners
SET category = 'artisan'
WHERE category = 'service_local';

UPDATE requests
SET category = 'artisan'
WHERE category = 'service_local';
