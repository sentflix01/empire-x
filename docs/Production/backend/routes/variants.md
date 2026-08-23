# backend/routes/variants.ts - Product variants: option matrices (size/color), per-variant stock and price overrides, validation against parent product.

> Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## Endpoints (4)

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/variants/product/:productId` | optional | 8 |
| `POST` | `/api/variants/product/:productId` | auth | 15 |
| `PUT` | `/api/variants/:id` | auth | 30 |
| `DELETE` | `/api/variants/:id` | auth | 42 |

## Notes
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

