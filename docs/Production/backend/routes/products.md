# backend/routes/products.ts - Marketplace catalog: product listing/detail/create/edit/archive by sellers, image sets, category filtering and safe sorting, view counting, stock handling, variant-aware payloads.

> Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## Endpoints (5)

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/products/` | optional | 31 |
| `GET` | `/api/products/:id` | optional | 64 |
| `POST` | `/api/products/` | auth | 73 |
| `PUT` | `/api/products/:id` | auth | 86 |
| `DELETE` | `/api/products/:id` | auth | 146 |

## Notes
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

