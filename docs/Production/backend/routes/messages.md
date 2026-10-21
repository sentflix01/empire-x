# backend/routes/messages.ts

## 1. What is this?

**Express API route module.** Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## 2. Why does it exist?

Chat REST layer backing Socket.IO: conversation lists, message history pagination, send/edit/delete/forward, read receipts. Real-time fan-out lives in socket.ts.

## 3. What does it do?


### Endpoints (45)

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/messages/conversations` | auth | 195 |
| `GET` | `/api/messages/unread-count` | auth | 205 |
| `GET` | `/api/messages/conversations/:id` | auth | 225 |
| `POST` | `/api/messages/conversations/:id/read` | auth | 246 |
| `POST` | `/api/messages/delivered` | auth | 279 |
| `PUT` | `/api/messages/conversations/:id/mute` | auth | 301 |
| `PUT` | `/api/messages/conversations/:id/archive` | auth | 318 |
| `POST` | `/api/messages/conversations/:id/accept` | auth | 331 |
| `DELETE` | `/api/messages/conversations/:id/for-me` | auth | 355 |
| `POST` | `/api/messages/conversations/find-or-create` | auth | 358 |
| `POST` | `/api/messages/conversations` | auth | 413 |
| `PUT` | `/api/messages/conversations/:id` | auth | 439 |
| `GET` | `/api/messages/conversations/:convId/messages` | auth | 463 |
| `POST` | `/api/messages/conversations/:convId/messages` | auth | 484 |
| `PUT` | `/api/messages/messages/:id` | auth | 597 |
| `DELETE` | `/api/messages/messages/:id` | auth | 598 |
| `DELETE` | `/api/messages/messages/:id/for-me` | auth | 599 |
| `DELETE` | `/api/messages/conversations/:id/history` | auth | 602 |
| `POST` | `/api/messages/conversations/:id/leave` | auth | 604 |
| `POST` | `/api/messages/conversations/:id/members` | auth | 632 |
| `DELETE` | `/api/messages/conversations/:id/members/:userId` | auth | 649 |
| `DELETE` | `/api/messages/conversations/:id` | auth | 660 |
| `PUT` | `/api/messages/presence` | auth | 673 |
| `GET` | `/api/messages/presence/:userId` | auth | 690 |
| `PUT` | `/api/messages/presence/settings` | auth | 716 |
| `POST` | `/api/messages/block/:targetId` | auth | 752 |
| `DELETE` | `/api/messages/block/:targetId` | auth | 753 |
| `GET` | `/api/messages/block/:targetId` | auth | 758 |
| `POST` | `/api/messages/messages/:id/forward` | auth | 791 |
| `POST` | `/api/messages/inquiry` | auth | 795 |
| `POST` | `/api/messages/messages/:id/reactions` | auth | 850 |
| `DELETE` | `/api/messages/messages/:id/reactions` | auth | 877 |
| `GET` | `/api/messages/messages/:id/reactions` | auth | 904 |
| `GET` | `/api/messages/search` | auth | 934 |
| `POST` | `/api/messages/messages/:id/pin` | auth | 1084 |
| `DELETE` | `/api/messages/messages/:id/pin` | auth | 1110 |
| `GET` | `/api/messages/conversations/:convId/pins` | auth | 1132 |
| `POST` | `/api/messages/saved/:id` | auth | 1153 |
| `DELETE` | `/api/messages/saved/:id` | auth | 1170 |
| `GET` | `/api/messages/saved` | auth | 1182 |
| `POST` | `/api/messages/share-product` | auth | 1203 |
| `PUT` | `/api/messages/:id` | auth | 1256 |
| `DELETE` | `/api/messages/:id` | auth | 1257 |
| `DELETE` | `/api/messages/:id/for-me` | auth | 1258 |
| `POST` | `/api/messages/:id/forward` | auth | 1259 |

## 4. What does it touch?

**Notes:**
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

**Machine catalog:** `backend/api-catalog.json` (regenerate: `npm run docs:api`).

**Contract:** follows the standard handler pipeline — see `../index.md`.
