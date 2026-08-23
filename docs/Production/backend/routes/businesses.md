# backend/routes/businesses.ts

## 1. What is this?

**Express API route module.** Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## 2. Why does it exist?

Business entity pages: create/manage business profiles linked to owners, business detail with product/showroom aggregation, employee/role basics.

## 3. What does it do?


### Endpoints (5)

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/businesses/` | optional | 10 |
| `GET` | `/api/businesses/:id` | optional | 19 |
| `POST` | `/api/businesses/` | auth | 27 |
| `PUT` | `/api/businesses/:id` | auth | 41 |
| `DELETE` | `/api/businesses/:id` | auth | 50 |

## 4. What does it touch?

**Notes:**
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

**Machine catalog:** `backend/api-catalog.json` (regenerate: `npm run docs:api`).

**Contract:** follows the standard handler pipeline — see `../index.md`.
