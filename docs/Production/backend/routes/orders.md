# backend/routes/orders.ts

## 1. What is this?

**Express API route module.** Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## 2. Why does it exist?

Money core: COD order creation (field allowlisted), order status transitions role-scoped buyer vs seller, Stripe Checkout sessions (multi-seller cart, server-side pricing, rounding adjustment line), Stripe webhooks (atomic idempotency claim, fulfillment, refunds, wallet topups) and Chapa checkout + verify callback + sandbox pages + status polling.

## 3. What does it do?


### Endpoints (11)

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/orders/` | auth | 60 |
| `GET` | `/api/orders/session/:sessionId` | auth | 89 |
| `GET` | `/api/orders/:id` | auth | 97 |
| `POST` | `/api/orders/` | auth | 135 |
| `PUT` | `/api/orders/:id` | auth | 163 |
| `POST` | `/api/orders/checkout/session` | auth | 212 |
| `POST` | `/api/orders/webhook` | public | 384 |
| `POST` | `/api/orders/checkout/chapa` | auth | 414 |
| `GET` | `/api/orders/chapa/sandbox` | public | 447 |
| `GET` | `/api/orders/chapa/status/:tx_ref` | public | 459 |
| `GET` | `/api/orders/chapa/verify/:tx_ref` | public | 470 |

## 4. What does it touch?

**Notes:**
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

**Machine catalog:** `backend/api-catalog.json` (regenerate: `npm run docs:api`).

**Contract:** follows the standard handler pipeline — see `../index.md`.
