# backend/routes/reviews.ts - Product reviews and star ratings: create/update with purchase-bias checks, per-product rating aggregates consumed by marketplace cards.

> Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## Endpoints (4)

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/reviews/` | optional | 9 |
| `GET` | `/api/reviews/product/:productId` | optional | 29 |
| `POST` | `/api/reviews/` | auth | 39 |
| `DELETE` | `/api/reviews/:id` | auth | 61 |

## Notes
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

