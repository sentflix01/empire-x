# backend/routes/telegram.ts - Telegram integration: bot webhook receiver and notifyUser helper used for seller payment alerts; chat-id linkage stored on users.

> Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## Endpoints (4)

| Method | Path | Auth | Line |
|---|---|---|---|
| `POST` | `/api/telegram/connect` | auth | 29 |
| `POST` | `/api/telegram/disconnect` | auth | 38 |
| `GET` | `/api/telegram/status` | auth | 45 |
| `POST` | `/api/telegram/test` | auth | 52 |

## Notes
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

