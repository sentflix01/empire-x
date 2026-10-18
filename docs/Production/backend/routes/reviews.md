# backend/routes/reviews.ts

## 1. What is this?

**Express API route module.** Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## 2. Why does it exist?

Product reviews and star ratings: create/update with purchase-bias checks, per-product rating aggregates consumed by marketplace cards.

## 3. What does it do?


### Endpoints (4)

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/reviews/` | optional | 10 |
| `GET` | `/api/reviews/product/:productId` | optional | 36 |
| `POST` | `/api/reviews/` | auth | 53 |
| `DELETE` | `/api/reviews/:id` | auth | 86 |

## 4. What does it touch?

**Notes:**
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

**Machine catalog:** `backend/api-catalog.json` (regenerate: `npm run docs:api`).

**Contract:** follows the standard handler pipeline — see `../index.md`.
