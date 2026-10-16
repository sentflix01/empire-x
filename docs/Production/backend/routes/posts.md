# backend/routes/posts.ts

## 1. What is this?

**Express API route module.** Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## 2. Why does it exist?

The social feed engine: smart ranked feed (recency + engagement + social boost) and chronological lists with keyset cursor pagination, post create (text/image/poll) with hashtag sync, like/comment/save counters, poll voting, delete.

## 3. What does it do?


### Endpoints (10)

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/posts/` | optional | 45 |
| `GET` | `/api/posts/:id` | optional | 113 |
| `POST` | `/api/posts/` | auth | 123 |
| `PUT` | `/api/posts/:id` | auth | 155 |
| `DELETE` | `/api/posts/:id` | auth | 176 |
| `GET` | `/api/posts/:id/like` | optional | 188 |
| `POST` | `/api/posts/:id/like` | auth | 196 |
| `GET` | `/api/posts/:id/comments` | optional | 226 |
| `POST` | `/api/posts/:id/comments` | auth | 241 |
| `DELETE` | `/api/posts/:postId/comments/:commentId` | auth | 293 |

## 4. What does it touch?

**Notes:**
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

**Machine catalog:** `backend/api-catalog.json` (regenerate: `npm run docs:api`).

**Contract:** follows the standard handler pipeline — see `../index.md`.
