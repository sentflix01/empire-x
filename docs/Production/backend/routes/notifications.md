# backend/routes/notifications.ts

## 1. What is this?

**Express API route module.** Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## 2. Why does it exist?

In-app notification inbox: list newest-first, unread count badge, mark-read single/all. Rows inserted by order/payment/social events; socket event new_notification pushes live.

## 3. What does it do?


### Endpoints (7)

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/notifications/` | auth | 12 |
| `GET` | `/api/notifications/unread-count` | auth | 87 |
| `POST` | `/api/notifications/` | auth | 99 |
| `PUT` | `/api/notifications/read-all` | auth | 118 |
| `POST` | `/api/notifications/mark-read` | auth | 125 |
| `PUT` | `/api/notifications/:id/read` | auth | 140 |
| `DELETE` | `/api/notifications/:id` | auth | 151 |

## 4. What does it touch?

**Notes:**
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

**Machine catalog:** `backend/api-catalog.json` (regenerate: `npm run docs:api`).

**Contract:** follows the standard handler pipeline — see `../index.md`.
