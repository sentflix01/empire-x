# backend/routes/products.ts

## 1. What is this?

**Express API route module.** Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## 2. Why does it exist?

Marketplace catalog: product listing/detail/create/edit/archive by sellers, image sets, category filtering and safe sorting, view counting, stock handling, variant-aware payloads.

## 3. What does it do?


### Endpoints (10)

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/products/` | optional | 71 |
| `GET` | `/api/products/mine` | auth | 175 |
| `GET` | `/api/products/lookup/:code` | auth | 195 |
| `POST` | `/api/products/import-image` | auth | 209 |
| `POST` | `/api/products/scan-batch` | auth | 225 |
| `GET` | `/api/products/:id` | optional | 287 |
| `POST` | `/api/products/` | auth | 310 |
| `PUT` | `/api/products/:id` | auth | 350 |
| `DELETE` | `/api/products/:id` | auth | 433 |
| `POST` | `/api/products/bulk-import` | auth | 445 |

## 4. What does it touch?

**Notes:**
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

**Machine catalog:** `backend/api-catalog.json` (regenerate: `npm run docs:api`).

**Contract:** follows the standard handler pipeline — see `../index.md`.
