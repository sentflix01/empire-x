# backend/routes/orders.ts - Money core: COD order creation (field allowlisted), order status transitions role-scoped buyer vs seller, Stripe Checkout sessions (multi-seller cart, server-side pricing, rounding adjustment line), Stripe webhooks (atomic idempotency claim, fulfillment, refunds, wallet topups) and Chapa checkout + verify callback + sandbox pages + status polling.

> Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## Endpoints (11)

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/orders/` | auth | 59 |
| `GET` | `/api/orders/session/:sessionId` | auth | 88 |
| `GET` | `/api/orders/:id` | auth | 96 |
| `POST` | `/api/orders/` | auth | 134 |
| `PUT` | `/api/orders/:id` | auth | 162 |
| `POST` | `/api/orders/checkout/session` | auth | 211 |
| `POST` | `/api/orders/webhook` | public | 376 |
| `POST` | `/api/orders/checkout/chapa` | auth | 406 |
| `GET` | `/api/orders/chapa/sandbox` | public | 439 |
| `GET` | `/api/orders/chapa/status/:tx_ref` | public | 451 |
| `GET` | `/api/orders/chapa/verify/:tx_ref` | public | 462 |

## Notes
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

