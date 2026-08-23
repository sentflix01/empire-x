# backend/routes/delivery.ts - Delivery timeline: status checkpoint inserts producing the order tracking timeline shown to buyers.

> Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## Endpoints (2)

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/delivery/order/:orderId` | optional | 9 |
| `POST` | `/api/delivery/` | auth | 19 |

## Notes
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

