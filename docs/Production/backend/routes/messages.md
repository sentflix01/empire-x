# backend/routes/messages.ts

## 1. What is this?

**Express API route module.** Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## 2. Why does it exist?

Chat REST layer backing Socket.IO: conversation lists, message history pagination, send/edit/delete/forward, read receipts. Real-time fan-out lives in socket.ts.

## 3. What does it do?


### Endpoints (34)

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/messages/conversations` | auth | 154 |
| `GET` | `/api/messages/unread-count` | auth | 164 |
| `GET` | `/api/messages/conversations/:id` | auth | 184 |
| `POST` | `/api/messages/conversations/:id/read` | auth | 205 |
| `POST` | `/api/messages/delivered` | auth | 238 |
| `PUT` | `/api/messages/conversations/:id/mute` | auth | 260 |
| `PUT` | `/api/messages/conversations/:id/archive` | auth | 277 |
| `POST` | `/api/messages/conversations/:id/accept` | auth | 290 |
| `DELETE` | `/api/messages/conversations/:id/for-me` | auth | 314 |
| `POST` | `/api/messages/conversations/find-or-create` | auth | 317 |
| `POST` | `/api/messages/conversations` | auth | 372 |
| `PUT` | `/api/messages/conversations/:id` | auth | 398 |
| `GET` | `/api/messages/conversations/:convId/messages` | auth | 422 |
| `POST` | `/api/messages/conversations/:convId/messages` | auth | 443 |
| `PUT` | `/api/messages/messages/:id` | auth | 525 |
| `DELETE` | `/api/messages/messages/:id` | auth | 526 |
| `DELETE` | `/api/messages/messages/:id/for-me` | auth | 527 |
| `DELETE` | `/api/messages/conversations/:id/history` | auth | 530 |
| `POST` | `/api/messages/conversations/:id/leave` | auth | 532 |
| `POST` | `/api/messages/conversations/:id/members` | auth | 560 |
| `DELETE` | `/api/messages/conversations/:id/members/:userId` | auth | 577 |
| `DELETE` | `/api/messages/conversations/:id` | auth | 588 |
| `PUT` | `/api/messages/presence` | auth | 601 |
| `GET` | `/api/messages/presence/:userId` | auth | 618 |
| `PUT` | `/api/messages/presence/settings` | auth | 644 |
| `POST` | `/api/messages/block/:targetId` | auth | 680 |
| `DELETE` | `/api/messages/block/:targetId` | auth | 681 |
| `GET` | `/api/messages/block/:targetId` | auth | 686 |
| `POST` | `/api/messages/messages/:id/forward` | auth | 719 |
| `POST` | `/api/messages/inquiry` | auth | 723 |
| `PUT` | `/api/messages/:id` | auth | 762 |
| `DELETE` | `/api/messages/:id` | auth | 763 |
| `DELETE` | `/api/messages/:id/for-me` | auth | 764 |
| `POST` | `/api/messages/:id/forward` | auth | 765 |

## 4. What does it touch?

**Notes:**
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

**Machine catalog:** `backend/api-catalog.json` (regenerate: `npm run docs:api`).

**Contract:** follows the standard handler pipeline — see `../index.md`.
