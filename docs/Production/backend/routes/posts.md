# backend/routes/posts.ts

## 1. What is this?

**Express API route module.** Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## 2. Why does it exist?

The social feed engine: smart ranked feed (recency + engagement + social boost) and chronological lists with keyset cursor pagination, post create (text/image/poll) with hashtag sync, like/comment/save counters, poll voting, delete.

## 3. What does it do?


### Endpoints (19)

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/posts/` | optional | 63 |
| `GET` | `/api/posts/:id` | optional | 148 |
| `POST` | `/api/posts/` | auth | 159 |
| `PUT` | `/api/posts/:id` | auth | 226 |
| `DELETE` | `/api/posts/:id` | auth | 260 |
| `GET` | `/api/posts/:id/like` | optional | 281 |
| `POST` | `/api/posts/:id/like` | auth | 289 |
| `PUT` | `/api/posts/:id/reaction` | auth | 336 |
| `DELETE` | `/api/posts/:id/reaction` | auth | 366 |
| `GET` | `/api/posts/:id/reactions` | auth | 376 |
| `POST` | `/api/posts/:id/hide` | auth | 396 |
| `DELETE` | `/api/posts/:id/hide` | auth | 403 |
| `PUT` | `/api/posts/:id/settings` | auth | 412 |
| `GET` | `/api/posts/:id/comments` | optional | 451 |
| `POST` | `/api/posts/:id/comments` | auth | 476 |
| `DELETE` | `/api/posts/:postId/comments/:commentId` | auth | 531 |
| `PUT` | `/api/posts/:postId/comments/:commentId` | auth | 546 |
| `PUT` | `/api/posts/:postId/comments/:commentId/reaction` | auth | 559 |
| `DELETE` | `/api/posts/:postId/comments/:commentId/reaction` | auth | 577 |

## 4. What does it touch?

**Notes:**
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

**Machine catalog:** `backend/api-catalog.json` (regenerate: `npm run docs:api`).

**Contract:** follows the standard handler pipeline — see `../index.md`.
