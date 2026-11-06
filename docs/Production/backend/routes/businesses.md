# backend/routes/businesses.ts

## 1. What is this?

**Express API route module.** Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## 2. Why does it exist?

Business entity pages: create/manage business profiles linked to owners, business detail with product/showroom aggregation, employee/role basics.

## 3. What does it do?


### Endpoints (10)

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/businesses/` | optional | 35 |
| `GET` | `/api/businesses/:id` | optional | 53 |
| `POST` | `/api/businesses/` | auth | 65 |
| `PUT` | `/api/businesses/:id` | auth | 86 |
| `DELETE` | `/api/businesses/:id` | auth | 99 |
| `GET` | `/api/businesses/:id/payment-accounts` | auth | 156 |
| `POST` | `/api/businesses/:id/payment-accounts` | auth | 164 |
| `PUT` | `/api/businesses/:id/payment-accounts/:accountId` | auth | 181 |
| `DELETE` | `/api/businesses/:id/payment-accounts/:accountId` | auth | 199 |
| `GET` | `/api/businesses/:id/checkout-info` | optional | 212 |

## 4. What does it touch?

**Notes:**
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

**Machine catalog:** `backend/api-catalog.json` (regenerate: `npm run docs:api`).

**Contract:** follows the standard handler pipeline — see `../index.md`.
