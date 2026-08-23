# backend/routes/trending.ts - Trending rankings: computed leaderboards for posts/products/showrooms cached via cacheMiddleware for cheap hot-path reads.

> Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## Endpoints (2)

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/trending/` | optional | 10 |
| `GET` | `/api/trending/warm` | public | 63 |

## Notes
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

