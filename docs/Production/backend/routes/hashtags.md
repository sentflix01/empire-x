# backend/routes/hashtags.ts - Hashtag engine: extracts/syncs post hashtags into hashtags/post_hashtags, hashtag page feeds, trending tag computation.

> Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## Endpoints (3)

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/hashtags/trending` | public | 23 |
| `GET` | `/api/hashtags/:name` | optional | 32 |
| `GET` | `/api/hashtags/:name/posts` | optional | 45 |

## Notes
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

