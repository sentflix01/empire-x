# backend/routes/wishlists.ts

## 1. What is this?

**Express API route module.** Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## 2. Why does it exist?

Wishlists plus price-alert sub-routes mounted under /api/price-alerts: save products to wishlist, target-price alerts checked on price changes.

## 3. What does it do?


### Endpoints (14)

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/wishlists/` | auth | 8 |
| `GET` | `/api/price-alerts/` | auth | 8 |
| `GET` | `/api/wishlists/check/:productId` | auth | 19 |
| `GET` | `/api/price-alerts/check/:productId` | auth | 19 |
| `POST` | `/api/wishlists/` | auth | 26 |
| `POST` | `/api/price-alerts/` | auth | 26 |
| `DELETE` | `/api/wishlists/:productId` | auth | 35 |
| `DELETE` | `/api/price-alerts/:productId` | auth | 35 |
| `GET` | `/api/wishlists/price-alerts` | auth | 44 |
| `GET` | `/api/price-alerts/price-alerts` | auth | 44 |
| `POST` | `/api/wishlists/price-alerts` | auth | 54 |
| `POST` | `/api/price-alerts/price-alerts` | auth | 54 |
| `DELETE` | `/api/wishlists/price-alerts/:productId` | auth | 67 |
| `DELETE` | `/api/price-alerts/price-alerts/:productId` | auth | 67 |

## 4. What does it touch?

**Notes:**
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

**Machine catalog:** `backend/api-catalog.json` (regenerate: `npm run docs:api`).

**Contract:** follows the standard handler pipeline — see `../index.md`.
