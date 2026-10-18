# backend/routes/posts.ts

## 1. What is this?

**Express API route module.** Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## 2. Why does it exist?

The social feed engine: smart ranked feed (recency + engagement + social boost) and chronological lists with keyset cursor pagination, post create (text/image/poll) with hashtag sync, like/comment/save counters, poll voting, delete.

## 3. What does it do?


### Endpoints (19)

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/posts/` | optional | 58 |
| `GET` | `/api/posts/:id` | optional | 143 |
| `POST` | `/api/posts/` | auth | 154 |
| `PUT` | `/api/posts/:id` | auth | 188 |
| `DELETE` | `/api/posts/:id` | auth | 222 |
| `GET` | `/api/posts/:id/like` | optional | 243 |
| `POST` | `/api/posts/:id/like` | auth | 251 |
| `PUT` | `/api/posts/:id/reaction` | auth | 298 |
| `DELETE` | `/api/posts/:id/reaction` | auth | 328 |
| `GET` | `/api/posts/:id/reactions` | auth | 338 |
| `POST` | `/api/posts/:id/hide` | auth | 358 |
| `DELETE` | `/api/posts/:id/hide` | auth | 365 |
| `PUT` | `/api/posts/:id/settings` | auth | 374 |
| `GET` | `/api/posts/:id/comments` | optional | 413 |
| `POST` | `/api/posts/:id/comments` | auth | 438 |
| `DELETE` | `/api/posts/:postId/comments/:commentId` | auth | 493 |
| `PUT` | `/api/posts/:postId/comments/:commentId` | auth | 508 |
| `PUT` | `/api/posts/:postId/comments/:commentId/reaction` | auth | 521 |
| `DELETE` | `/api/posts/:postId/comments/:commentId/reaction` | auth | 539 |

## 4. What does it touch?

**Notes:**
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

**Machine catalog:** `backend/api-catalog.json` (regenerate: `npm run docs:api`).

**Contract:** follows the standard handler pipeline — see `../index.md`.
