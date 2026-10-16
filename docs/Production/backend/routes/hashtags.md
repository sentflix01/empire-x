# backend/routes/hashtags.ts

## 1. What is this?

**Express API route module.** Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## 2. Why does it exist?

Hashtag engine: extracts/syncs post hashtags into hashtags/post_hashtags, hashtag page feeds, trending tag computation.

## 3. What does it do?


### Endpoints (3)

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/hashtags/trending` | public | 24 |
| `GET` | `/api/hashtags/:name` | optional | 44 |
| `GET` | `/api/hashtags/:name/posts` | optional | 68 |

## 4. What does it touch?

**Notes:**
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

**Machine catalog:** `backend/api-catalog.json` (regenerate: `npm run docs:api`).

**Contract:** follows the standard handler pipeline — see `../index.md`.
