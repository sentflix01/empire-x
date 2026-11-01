# backend/routes/stories.ts

## 1. What is this?

**Express API route module.** Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## 2. Why does it exist?

24-hour ephemeral stories: create with media, ring list of active viewers, story views recording, expiry handled by cleanupStories scheduler.

## 3. What does it do?


### Endpoints (8)

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/stories/` | optional | 17 |
| `GET` | `/api/stories/user/:userId` | optional | 31 |
| `POST` | `/api/stories/` | auth | 44 |
| `POST` | `/api/stories/:id/view` | auth | 56 |
| `POST` | `/api/stories/:id/reactions` | auth | 64 |
| `GET` | `/api/stories/:id/comments` | auth | 79 |
| `POST` | `/api/stories/:id/comments` | auth | 86 |
| `DELETE` | `/api/stories/:id` | auth | 104 |

## 4. What does it touch?

**Notes:**
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

**Machine catalog:** `backend/api-catalog.json` (regenerate: `npm run docs:api`).

**Contract:** follows the standard handler pipeline — see `../index.md`.
