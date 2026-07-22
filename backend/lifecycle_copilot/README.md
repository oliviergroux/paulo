# Lifecycle Copilot (backend)

Isolated CRM lifecycle analysis module. Not coupled to Paulo domain logic.

## API prefix

`/lifecycle-copilot/v1`

## Auth

Same as Paulo admin: `X-Admin-Key` header (frontend proxy enforces admin session).

## Migrations

SQL files live in `db/migrations/`. Run manually on Neon — do not mix into Paulo `ensure_schema()`.

## Object storage

S3-compatible (AWS S3, Cloudflare R2, etc.). Required for CSV/XLSX imports (PR2+).

Environment variables:

- `LC_STORAGE_BUCKET`
- `LC_STORAGE_REGION` (use `auto` for R2)
- `LC_STORAGE_ACCESS_KEY_ID`
- `LC_STORAGE_SECRET_ACCESS_KEY`
- `LC_STORAGE_ENDPOINT_URL` (optional, for R2/MinIO)
- `LC_STORAGE_PUBLIC_BASE_URL` (optional)

## Module roadmap

| Module | Path | Status |
|--------|------|--------|
| Projects | `modules/projects/` | PR1 |
| Dictionary | `modules/dictionary/` | PR2 |
| Datasets | `modules/datasets/` | PR3 |
| Profiling | `modules/profiling/` | PR4 |
