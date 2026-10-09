> ⚠️ **HISTORICAL** — corresponding source file was removed from the codebase on 2026-10-08. Kept for reference.

# backend/routes/tasks.ts

## 1. What is this?

**Express API route module.** Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## 2. Why does it exist?

Gig/task marketplace: task posting with offered payment, bidding flow, offer accept/reject, completion flow feeding wallet payouts.

## 3. What does it do?


### Endpoints (10)

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/tasks/` | optional | 54 |
| `GET` | `/api/tasks/bids` | auth | 67 |
| `GET` | `/api/tasks/bids/:bidId` | auth | 85 |
| `GET` | `/api/tasks/:id` | optional | 99 |
| `POST` | `/api/tasks/` | auth | 107 |
| `PUT` | `/api/tasks/bids/:bidId` | auth | 130 |
| `PUT` | `/api/tasks/:id` | auth | 223 |
| `DELETE` | `/api/tasks/:id` | auth | 270 |
| `GET` | `/api/tasks/:taskId/bids` | optional | 280 |
| `POST` | `/api/tasks/:taskId/bids` | auth | 291 |

## 4. What does it touch?

**Notes:**
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

**Machine catalog:** `backend/api-catalog.json` (regenerate: `npm run docs:api`).

**Contract:** follows the standard handler pipeline — see `../index.md`.
