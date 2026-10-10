# backend/routes/maps.ts

## 1. What is this?

**Express API route module.** Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## 2. Why does it exist?

Map data: nearby products, businesses, and people within radius via Haversine SQL (no PostGIS), marker clustering payloads, profile peek info. Task listings are deferred and are not returned by these endpoints.

## 3. What does it do?


### Endpoints (2)

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/maps/nearby/product-search` | optional | 25 |
| `GET` | `/api/maps/nearby` | optional | 102 |

## 4. What does it touch?

**Notes:**
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

**Machine catalog:** `backend/api-catalog.json` (regenerate: `npm run docs:api`).

**Contract:** follows the standard handler pipeline — see `../index.md`.
