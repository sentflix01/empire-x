# backend/routes/docs.ts - Docs library API serving the docs/ folder tree and full-text search results into the admin DevOps panel.

> Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## Endpoints (1)

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/docs/` | public | 6 |

## Notes
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

