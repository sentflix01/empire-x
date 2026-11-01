# backend/routes/posts.ts

## 1. What is this?

**Express API route module.** Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## 2. Why does it exist?

The social feed engine: smart ranked feed (recency + engagement + social boost) and chronological lists with keyset cursor pagination, post create (text/image/poll) with hashtag sync, like/comment/save counters, poll voting, delete.

## 3. What does it do?


### Endpoints (19)

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/posts/` | optional | 60 |
| `GET` | `/api/posts/:id` | optional | 145 |
| `POST` | `/api/posts/` | auth | 156 |
| `PUT` | `/api/posts/:id` | auth | 223 |
| `DELETE` | `/api/posts/:id` | auth | 257 |
| `GET` | `/api/posts/:id/like` | optional | 278 |
| `POST` | `/api/posts/:id/like` | auth | 286 |
| `PUT` | `/api/posts/:id/reaction` | auth | 333 |
| `DELETE` | `/api/posts/:id/reaction` | auth | 363 |
| `GET` | `/api/posts/:id/reactions` | auth | 373 |
| `POST` | `/api/posts/:id/hide` | auth | 393 |
| `DELETE` | `/api/posts/:id/hide` | auth | 400 |
| `PUT` | `/api/posts/:id/settings` | auth | 409 |
| `GET` | `/api/posts/:id/comments` | optional | 448 |
| `POST` | `/api/posts/:id/comments` | auth | 473 |
| `DELETE` | `/api/posts/:postId/comments/:commentId` | auth | 528 |
| `PUT` | `/api/posts/:postId/comments/:commentId` | auth | 543 |
| `PUT` | `/api/posts/:postId/comments/:commentId/reaction` | auth | 556 |
| `DELETE` | `/api/posts/:postId/comments/:commentId/reaction` | auth | 574 |

## 4. What does it touch?

**Notes:**
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

**Machine catalog:** `backend/api-catalog.json` (regenerate: `npm run docs:api`).

**Contract:** follows the standard handler pipeline — see `../index.md`.
