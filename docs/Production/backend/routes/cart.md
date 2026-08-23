# backend/routes/cart.ts - Shopping cart: add/update/remove line items incl. variant selection, cart totals computation feeding checkout session creation.

> Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## Endpoints (5)

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/cart/` | auth | 9 |
| `POST` | `/api/cart/add` | auth | 21 |
| `PUT` | `/api/cart/:itemId` | auth | 42 |
| `DELETE` | `/api/cart/:itemId` | auth | 55 |
| `DELETE` | `/api/cart/` | auth | 62 |

## Notes
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

