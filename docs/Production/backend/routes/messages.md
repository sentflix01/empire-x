# backend/routes/messages.ts

## 1. What is this?

**Express API route module.** Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## 2. Why does it exist?

Chat REST layer backing Socket.IO: conversation lists, message history pagination, send/edit/delete/forward, read receipts. Real-time fan-out lives in socket.ts.

## 3. What does it do?

### Endpoints

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/messages/conversations` | auth | 80 |
| `GET` | `/api/messages/conversations/:id` | auth | 105 |
| `POST` | `/api/messages/conversations/find-or-create` | auth | 114 |
| `POST` | `/api/messages/conversations` | auth | 149 |
| `PUT` | `/api/messages/conversations/:id` | auth | 171 |
| `GET` | `/api/messages/conversations/:convId/messages` | auth | 182 |
| `POST` | `/api/messages/conversations/:convId/messages` | auth | 195 |
| `PUT` | `/api/messages/messages/:id` | auth | 249 |
| `DELETE` | `/api/messages/messages/:id` | auth | 262 |
| `DELETE` | `/api/messages/conversations/:id/history` | auth | 273 |
| `POST` | `/api/messages/conversations/:id/leave` | auth | 281 |
| `POST` | `/api/messages/conversations/:id/members` | auth | 293 |
| `DELETE` | `/api/messages/conversations/:id/members/:userId` | auth | 308 |
| `DELETE` | `/api/messages/conversations/:id` | auth | 321 |
| `PUT` | `/api/messages/presence` | auth | 334 |
| `GET` | `/api/messages/presence/:userId` | auth | 347 |
| `PUT` | `/api/messages/presence/settings` | auth | 362 |
| `POST` | `/api/messages/block/:targetId` | auth | 371 |
| `DELETE` | `/api/messages/block/:targetId` | auth | 377 |
| `GET` | `/api/messages/block/:targetId` | auth | 382 |
| `POST` | `/api/messages/messages/:id/forward` | auth | 389 |
| `POST` | `/api/messages/inquiry` | auth | 408 |


## 4. What does it touch?

**Notes:**
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

**Machine catalog:** `backend/api-catalog.json` (regenerate: `npm run docs:api`).

**Contract:** follows the standard handler pipeline — see `../index.md`.
