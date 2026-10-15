# backend/routes/messages.ts

## 1. What is this?

**Express API route module.** Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## 2. Why does it exist?

Chat REST layer backing Socket.IO: conversation lists, message history pagination, send/edit/delete/forward, read receipts. Real-time fan-out lives in socket.ts.

## 3. What does it do?


### Endpoints (22)

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/messages/conversations` | auth | 80 |
| `GET` | `/api/messages/conversations/:id` | auth | 105 |
| `POST` | `/api/messages/conversations/find-or-create` | auth | 114 |
| `POST` | `/api/messages/conversations` | auth | 152 |
| `PUT` | `/api/messages/conversations/:id` | auth | 174 |
| `GET` | `/api/messages/conversations/:convId/messages` | auth | 198 |
| `POST` | `/api/messages/conversations/:convId/messages` | auth | 216 |
| `PUT` | `/api/messages/messages/:id` | auth | 270 |
| `DELETE` | `/api/messages/messages/:id` | auth | 283 |
| `DELETE` | `/api/messages/conversations/:id/history` | auth | 294 |
| `POST` | `/api/messages/conversations/:id/leave` | auth | 302 |
| `POST` | `/api/messages/conversations/:id/members` | auth | 314 |
| `DELETE` | `/api/messages/conversations/:id/members/:userId` | auth | 329 |
| `DELETE` | `/api/messages/conversations/:id` | auth | 342 |
| `PUT` | `/api/messages/presence` | auth | 355 |
| `GET` | `/api/messages/presence/:userId` | auth | 370 |
| `PUT` | `/api/messages/presence/settings` | auth | 387 |
| `POST` | `/api/messages/block/:targetId` | auth | 396 |
| `DELETE` | `/api/messages/block/:targetId` | auth | 402 |
| `GET` | `/api/messages/block/:targetId` | auth | 407 |
| `POST` | `/api/messages/messages/:id/forward` | auth | 414 |
| `POST` | `/api/messages/inquiry` | auth | 433 |

## 4. What does it touch?

**Notes:**
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

**Machine catalog:** `backend/api-catalog.json` (regenerate: `npm run docs:api`).

**Contract:** follows the standard handler pipeline — see `../index.md`.
