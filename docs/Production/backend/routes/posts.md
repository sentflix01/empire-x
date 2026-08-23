# backend/routes/posts.ts

## 1. What is this?

**Express API route module.** Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## 2. Why does it exist?

The social feed engine: smart ranked feed (recency + engagement + social boost) and chronological lists with keyset cursor pagination, post create (text/image/poll) with hashtag sync, like/comment/save counters, poll voting, delete.

## 3. What does it do?

### Endpoints

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/posts/` | optional | 26 |
| `GET` | `/api/posts/:id` | optional | 88 |
| `POST` | `/api/posts/` | auth | 96 |
| `PUT` | `/api/posts/:id` | auth | 125 |
| `DELETE` | `/api/posts/:id` | auth | 134 |
| `GET` | `/api/posts/:id/like` | optional | 146 |
| `POST` | `/api/posts/:id/like` | auth | 154 |
| `GET` | `/api/posts/:id/comments` | optional | 184 |
| `POST` | `/api/posts/:id/comments` | auth | 196 |
| `DELETE` | `/api/posts/:postId/comments/:commentId` | auth | 248 |


## 4. What does it touch?

**Notes:**
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

**Machine catalog:** `backend/api-catalog.json` (regenerate: `npm run docs:api`).

**Contract:** follows the standard handler pipeline — see `../index.md`.
