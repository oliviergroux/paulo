-- Drop all Lifecycle Copilot tables (prefix lc_).
-- Safe to run multiple times. Does not touch Paulo tables.

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename LIKE 'lc\_%' ESCAPE '\'
  LOOP
    EXECUTE format('DROP TABLE IF EXISTS %I CASCADE', r.tablename);
  END LOOP;
END $$;
