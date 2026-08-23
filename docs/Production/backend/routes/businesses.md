# backend/routes/businesses.ts - Business entity pages: create/manage business profiles linked to owners, business detail with product/showroom aggregation, employee/role basics.

> Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## Endpoints (5)

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/businesses/` | optional | 10 |
| `GET` | `/api/businesses/:id` | optional | 19 |
| `POST` | `/api/businesses/` | auth | 27 |
| `PUT` | `/api/businesses/:id` | auth | 41 |
| `DELETE` | `/api/businesses/:id` | auth | 50 |

## Notes
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

