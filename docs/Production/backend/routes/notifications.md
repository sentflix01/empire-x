# backend/routes/notifications.ts - In-app notification inbox: list newest-first, unread count badge, mark-read single/all. Rows inserted by order/payment/social events; socket event new_notification pushes live.

> Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## Endpoints (6)

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/notifications/` | auth | 12 |
| `POST` | `/api/notifications/` | auth | 73 |
| `PUT` | `/api/notifications/read-all` | auth | 84 |
| `POST` | `/api/notifications/mark-read` | auth | 91 |
| `PUT` | `/api/notifications/:id/read` | auth | 106 |
| `DELETE` | `/api/notifications/:id` | auth | 117 |

## Notes
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

