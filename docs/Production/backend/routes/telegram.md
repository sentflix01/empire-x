# backend/routes/telegram.ts

## 1. What is this?

**Express API route module.** Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## 2. Why does it exist?

Telegram integration: bot webhook receiver and notifyUser helper used for seller payment alerts; chat-id linkage stored on users.

## 3. What does it do?


### Endpoints (6)

| Method | Path | Auth | Line |
|---|---|---|---|
| `POST` | `/api/telegram/connect` | auth | 39 |
| `POST` | `/api/telegram/disconnect` | auth | 62 |
| `DELETE` | `/api/telegram/disconnect` | auth | 63 |
| `GET` | `/api/telegram/status` | auth | 65 |
| `PUT` | `/api/telegram/notifications` | auth | 79 |
| `POST` | `/api/telegram/test` | auth | 95 |

- The chat id and the on/off switch live on `users` (`telegram_chat_id`, `telegram_notifications`, default off). Before audit F-005 the routes read `user_profiles`, so every call failed and no alert was sent.
- `connect` accepts a numeric chat id only (`^-?\d{1,20}$`) and turns notifications on.
- `PUT /notifications` takes `{ "enabled": boolean }` and returns `{ "enabled" }`; 409 `TELEGRAM_NOT_CONNECTED` when turning on without a chat.
- `status` returns `{ connected, notifications_enabled, bot_configured }`.
- `notifyUser(userId, text)` sends only when a chat is connected and notifications are on.

## 4. What does it touch?

**Notes:**
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

**Machine catalog:** `backend/api-catalog.json` (regenerate: `npm run docs:api`).

**Contract:** follows the standard handler pipeline — see `../index.md`.
