# Lifecycle Copilot

Module isolé dans le monorepo Paulo. Produit consultant CRM IA.

## Accès

- URL : `/lifecycle-copilot` (accès direct, pas de lien dans la nav Paulo)
- Auth : login admin Paulo uniquement

## Décisions validées

| Sujet | Choix |
|-------|--------|
| Route | `/lifecycle-copilot` |
| Auth | Admin Paulo only |
| Fichiers lourds | Object storage S3-compatible |
| Imports | CSV + XLSX |
| Nav Paulo | Aucun lien |

## Structure frontend

```
app/lifecycle-copilot/
components/lifecycle-copilot/
lib/lifecycle-copilot/
app/api/lifecycle-copilot/[...path]/
```

## Structure backend

```
backend/lifecycle_copilot/
  router.py
  modules/projects/
  storage/
  db/migrations/
```

## API

Backend : `/lifecycle-copilot/v1/*`  
Frontend proxy : `/api/lifecycle-copilot/v1/*`

## Roadmap PRs

- PR0 ✅ Squelette (cette base)
- PR1 CRUD projets + migration `lc_projects`
- PR2 Import dictionnaire CSV/XLSX
- PR3 Import datasets + object storage
- PR4 Profiling basique
