# backend/routes/tasks.ts

## 1. What is this?

**Express API route module.** Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## 2. Why does it exist?

Gig/task marketplace: task posting with offered payment, bidding flow, offer accept/reject, completion flow feeding wallet payouts.

## 3. What does it do?

### Endpoints

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/tasks/` | optional | 54 |
| `GET` | `/api/tasks/:id` | optional | 65 |
| `POST` | `/api/tasks/` | auth | 73 |
| `PUT` | `/api/tasks/bids/:bidId` | auth | 88 |
| `PUT` | `/api/tasks/:id` | auth | 100 |
| `DELETE` | `/api/tasks/:id` | auth | 109 |
| `GET` | `/api/tasks/:taskId/bids` | optional | 119 |
| `POST` | `/api/tasks/:taskId/bids` | auth | 126 |


## 4. What does it touch?

**Notes:**
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

**Machine catalog:** `backend/api-catalog.json` (regenerate: `npm run docs:api`).

**Contract:** follows the standard handler pipeline — see `../index.md`.
