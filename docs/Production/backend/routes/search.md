# backend/routes/search.ts - Global search: keyword queries across products/posts/users/businesses using FTS vectors where available plus ILIKE fallback; geo distance search variant using Haversine SQL.

> Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## Endpoints (1)

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/search/` | optional | 45 |

## Notes
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

