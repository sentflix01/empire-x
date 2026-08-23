# backend/routes/cart.ts

## 1. What is this?

**Express API route module.** Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## 2. Why does it exist?

Shopping cart: add/update/remove line items incl. variant selection, cart totals computation feeding checkout session creation.

## 3. What does it do?


### Endpoints (5)

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/cart/` | auth | 9 |
| `POST` | `/api/cart/add` | auth | 21 |
| `PUT` | `/api/cart/:itemId` | auth | 42 |
| `DELETE` | `/api/cart/:itemId` | auth | 55 |
| `DELETE` | `/api/cart/` | auth | 62 |

## 4. What does it touch?

**Notes:**
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

**Machine catalog:** `backend/api-catalog.json` (regenerate: `npm run docs:api`).

**Contract:** follows the standard handler pipeline — see `../index.md`.
