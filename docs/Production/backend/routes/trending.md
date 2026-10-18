# backend/routes/trending.ts

## 1. What is this?

**Express API route module.** Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## 2. Why does it exist?

Trending rankings: computed leaderboards for posts/products/showrooms cached via cacheMiddleware for cheap hot-path reads.

## 3. What does it do?


### Endpoints (2)

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/trending/` | optional | 53 |
| `GET` | `/api/trending/warm` | optional | 75 |

## 4. What does it touch?

**Notes:**
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

**Machine catalog:** `backend/api-catalog.json` (regenerate: `npm run docs:api`).

**Contract:** follows the standard handler pipeline — see `../index.md`.
