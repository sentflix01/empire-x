# backend/routes/flags.ts - Public feature-flag exposure: returns effective flags for the calling user so the frontend can gate UI without secrets.

> Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## Endpoints (3)

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/flags/` | auth | 8 |
| `GET` | `/api/flags/:name` | auth | 22 |
| `PUT` | `/api/flags/:name` | admin | 29 |

## Notes
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

