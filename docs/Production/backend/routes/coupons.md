# backend/routes/coupons.ts

## 1. What is this?

**Express API route module.** Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## 2. Why does it exist?

Seller coupon system: create/manage discount codes (percentage/fixed, min order, usage limits), validate/apply during checkout, usage_count increments server-side.

## 3. What does it do?


### Endpoints (6)

| Method | Path | Auth | Line |
|---|---|---|---|
| `POST` | `/api/coupons/` | auth | 8 |
| `GET` | `/api/coupons/mine` | auth | 25 |
| `POST` | `/api/coupons/validate` | public | 32 |
| `POST` | `/api/coupons/use` | auth | 52 |
| `PATCH` | `/api/coupons/:id/toggle` | auth | 60 |
| `DELETE` | `/api/coupons/:id` | auth | 70 |

## 4. What does it touch?

**Notes:**
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

**Machine catalog:** `backend/api-catalog.json` (regenerate: `npm run docs:api`).

**Contract:** follows the standard handler pipeline — see `../index.md`.
