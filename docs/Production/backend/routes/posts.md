# backend/routes/posts.ts

## 1. What is this?

**Express API route module.** Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## 2. Why does it exist?

The social feed engine: smart ranked feed (recency + engagement + social boost) and chronological lists with keyset cursor pagination, post create (text/image/poll) with hashtag sync, like/comment/save counters, poll voting, delete.

## 3. What does it do?


### Endpoints (19)

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/posts/` | optional | 59 |
| `GET` | `/api/posts/:id` | optional | 144 |
| `POST` | `/api/posts/` | auth | 155 |
| `PUT` | `/api/posts/:id` | auth | 222 |
| `DELETE` | `/api/posts/:id` | auth | 256 |
| `GET` | `/api/posts/:id/like` | optional | 277 |
| `POST` | `/api/posts/:id/like` | auth | 285 |
| `PUT` | `/api/posts/:id/reaction` | auth | 332 |
| `DELETE` | `/api/posts/:id/reaction` | auth | 362 |
| `GET` | `/api/posts/:id/reactions` | auth | 372 |
| `POST` | `/api/posts/:id/hide` | auth | 392 |
| `DELETE` | `/api/posts/:id/hide` | auth | 399 |
| `PUT` | `/api/posts/:id/settings` | auth | 408 |
| `GET` | `/api/posts/:id/comments` | optional | 447 |
| `POST` | `/api/posts/:id/comments` | auth | 472 |
| `DELETE` | `/api/posts/:postId/comments/:commentId` | auth | 527 |
| `PUT` | `/api/posts/:postId/comments/:commentId` | auth | 542 |
| `PUT` | `/api/posts/:postId/comments/:commentId/reaction` | auth | 555 |
| `DELETE` | `/api/posts/:postId/comments/:commentId/reaction` | auth | 573 |

## 4. What does it touch?

**Notes:**
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

**Machine catalog:** `backend/api-catalog.json` (regenerate: `npm run docs:api`).

**Contract:** follows the standard handler pipeline — see `../index.md`.
