# backend/routes/posts.ts

## 1. What is this?

**Express API route module.** Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## 2. Why does it exist?

The social feed engine: smart ranked feed (recency + engagement + social boost) and chronological lists with keyset cursor pagination, post create (text/image/poll) with hashtag sync, like/comment/save counters, poll voting, delete.

## 3. What does it do?


### Endpoints (10)

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/posts/` | optional | 38 |
| `GET` | `/api/posts/:id` | optional | 102 |
| `POST` | `/api/posts/` | auth | 111 |
| `PUT` | `/api/posts/:id` | auth | 140 |
| `DELETE` | `/api/posts/:id` | auth | 149 |
| `GET` | `/api/posts/:id/like` | optional | 161 |
| `POST` | `/api/posts/:id/like` | auth | 169 |
| `GET` | `/api/posts/:id/comments` | optional | 199 |
| `POST` | `/api/posts/:id/comments` | auth | 211 |
| `DELETE` | `/api/posts/:postId/comments/:commentId` | auth | 263 |

## 4. What does it touch?

**Notes:**
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

**Machine catalog:** `backend/api-catalog.json` (regenerate: `npm run docs:api`).

**Contract:** follows the standard handler pipeline — see `../index.md`.
