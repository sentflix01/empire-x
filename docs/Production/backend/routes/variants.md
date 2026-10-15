# backend/routes/variants.ts

## 1. What is this?

**Express API route module.** Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## 2. Why does it exist?

Product variants: option matrices (size/color), per-variant stock and price overrides, validation against parent product.

## 3. What does it do?


### Endpoints (4)

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/variants/product/:productId` | optional | 20 |
| `POST` | `/api/variants/product/:productId` | auth | 34 |
| `PUT` | `/api/variants/:id` | auth | 49 |
| `DELETE` | `/api/variants/:id` | auth | 64 |

## 4. What does it touch?

**Notes:**
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

**Machine catalog:** `backend/api-catalog.json` (regenerate: `npm run docs:api`).

**Contract:** follows the standard handler pipeline — see `../index.md`.
