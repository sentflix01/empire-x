# backend/routes/messages.ts

## 1. What is this?

**Express API route module.** Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## 2. Why does it exist?

Chat REST layer backing Socket.IO: conversation lists, message history pagination, send/edit/delete/forward, read receipts. Real-time fan-out lives in socket.ts.

## 3. What does it do?


### Endpoints (22)

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/messages/conversations` | auth | 81 |
| `GET` | `/api/messages/conversations/:id` | auth | 106 |
| `POST` | `/api/messages/conversations/find-or-create` | auth | 115 |
| `POST` | `/api/messages/conversations` | auth | 155 |
| `PUT` | `/api/messages/conversations/:id` | auth | 177 |
| `GET` | `/api/messages/conversations/:convId/messages` | auth | 201 |
| `POST` | `/api/messages/conversations/:convId/messages` | auth | 219 |
| `PUT` | `/api/messages/messages/:id` | auth | 273 |
| `DELETE` | `/api/messages/messages/:id` | auth | 286 |
| `DELETE` | `/api/messages/conversations/:id/history` | auth | 297 |
| `POST` | `/api/messages/conversations/:id/leave` | auth | 305 |
| `POST` | `/api/messages/conversations/:id/members` | auth | 317 |
| `DELETE` | `/api/messages/conversations/:id/members/:userId` | auth | 332 |
| `DELETE` | `/api/messages/conversations/:id` | auth | 345 |
| `PUT` | `/api/messages/presence` | auth | 358 |
| `GET` | `/api/messages/presence/:userId` | auth | 373 |
| `PUT` | `/api/messages/presence/settings` | auth | 390 |
| `POST` | `/api/messages/block/:targetId` | auth | 399 |
| `DELETE` | `/api/messages/block/:targetId` | auth | 405 |
| `GET` | `/api/messages/block/:targetId` | auth | 410 |
| `POST` | `/api/messages/messages/:id/forward` | auth | 417 |
| `POST` | `/api/messages/inquiry` | auth | 439 |

## 4. What does it touch?

**Notes:**
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

**Machine catalog:** `backend/api-catalog.json` (regenerate: `npm run docs:api`).

**Contract:** follows the standard handler pipeline — see `../index.md`.
