# backend/routes/products.ts

## 1. What is this?

**Express API route module.** Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## 2. Why does it exist?

Marketplace catalog: product listing/detail/create/edit/archive by sellers, image sets, category filtering and safe sorting, view counting, stock handling, variant-aware payloads.

## 3. What does it do?


### Endpoints (10)

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/products/` | optional | 77 |
| `GET` | `/api/products/mine` | auth | 184 |
| `GET` | `/api/products/lookup/:code` | auth | 204 |
| `POST` | `/api/products/import-image` | auth | 218 |
| `POST` | `/api/products/scan-batch` | auth | 256 |
| `GET` | `/api/products/:id` | optional | 324 |
| `POST` | `/api/products/` | auth | 347 |
| `PUT` | `/api/products/:id` | auth | 402 |
| `DELETE` | `/api/products/:id` | auth | 485 |
| `POST` | `/api/products/bulk-import` | auth | 497 |

## 4. What does it touch?

**Notes:**
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

**Machine catalog:** `backend/api-catalog.json` (regenerate: `npm run docs:api`).

**Contract:** follows the standard handler pipeline — see `../index.md`.
