# backend/routes/messages.ts

## 1. What is this?

**Express API route module.** Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## 2. Why does it exist?

Chat REST layer backing Socket.IO: conversation lists, message history pagination, send/edit/delete/forward, read receipts. Real-time fan-out lives in socket.ts.

## 3. What does it do?


### Endpoints (49)

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/messages/conversations` | auth | 209 |
| `GET` | `/api/messages/unread-count` | auth | 220 |
| `GET` | `/api/messages/conversations/:id` | auth | 242 |
| `POST` | `/api/messages/conversations/:id/read` | auth | 263 |
| `POST` | `/api/messages/delivered` | auth | 297 |
| `PUT` | `/api/messages/conversations/:id/mute` | auth | 319 |
| `PUT` | `/api/messages/conversations/:id/archive` | auth | 336 |
| `POST` | `/api/messages/conversations/:id/accept` | auth | 349 |
| `DELETE` | `/api/messages/conversations/:id/for-me` | auth | 373 |
| `POST` | `/api/messages/conversations/find-or-create` | auth | 376 |
| `POST` | `/api/messages/conversations/business` | auth | 480 |
| `GET` | `/api/messages/quick-replies` | auth | 498 |
| `PUT` | `/api/messages/quick-replies` | auth | 507 |
| `POST` | `/api/messages/conversations` | auth | 535 |
| `PUT` | `/api/messages/conversations/:id` | auth | 561 |
| `GET` | `/api/messages/conversations/:convId/messages` | auth | 586 |
| `POST` | `/api/messages/conversations/:convId/messages` | auth | 607 |
| `PUT` | `/api/messages/messages/:id` | auth | 698 |
| `DELETE` | `/api/messages/messages/:id` | auth | 699 |
| `DELETE` | `/api/messages/messages/:id/for-me` | auth | 700 |
| `DELETE` | `/api/messages/conversations/:id/history` | auth | 703 |
| `POST` | `/api/messages/conversations/:id/leave` | auth | 705 |
| `POST` | `/api/messages/conversations/:id/members` | auth | 734 |
| `DELETE` | `/api/messages/conversations/:id/members/:userId` | auth | 752 |
| `PUT` | `/api/messages/conversations/:id/members/:userId` | auth | 766 |
| `DELETE` | `/api/messages/conversations/:id` | auth | 792 |
| `PUT` | `/api/messages/presence` | auth | 806 |
| `GET` | `/api/messages/presence/:userId` | auth | 823 |
| `PUT` | `/api/messages/presence/settings` | auth | 849 |
| `POST` | `/api/messages/block/:targetId` | auth | 885 |
| `DELETE` | `/api/messages/block/:targetId` | auth | 886 |
| `GET` | `/api/messages/block/:targetId` | auth | 891 |
| `POST` | `/api/messages/messages/:id/forward` | auth | 924 |
| `POST` | `/api/messages/inquiry` | auth | 928 |
| `POST` | `/api/messages/messages/:id/reactions` | auth | 998 |
| `DELETE` | `/api/messages/messages/:id/reactions` | auth | 1023 |
| `GET` | `/api/messages/messages/:id/reactions` | auth | 1050 |
| `GET` | `/api/messages/search` | auth | 1080 |
| `POST` | `/api/messages/messages/:id/pin` | auth | 1230 |
| `DELETE` | `/api/messages/messages/:id/pin` | auth | 1256 |
| `GET` | `/api/messages/conversations/:convId/pins` | auth | 1278 |
| `POST` | `/api/messages/saved/:id` | auth | 1299 |
| `DELETE` | `/api/messages/saved/:id` | auth | 1316 |
| `GET` | `/api/messages/saved` | auth | 1328 |
| `POST` | `/api/messages/share-product` | auth | 1349 |
| `PUT` | `/api/messages/:id` | auth | 1402 |
| `DELETE` | `/api/messages/:id` | auth | 1403 |
| `DELETE` | `/api/messages/:id/for-me` | auth | 1404 |
| `POST` | `/api/messages/:id/forward` | auth | 1405 |

## 4. What does it touch?

**Notes:**
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

**Machine catalog:** `backend/api-catalog.json` (regenerate: `npm run docs:api`).

**Contract:** follows the standard handler pipeline — see `../index.md`.
