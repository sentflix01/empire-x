# backend/routes/mewacho

<!-- AUTO-STUB  2026-09-19 — curate narrative below -->

## 1. What is this?

**Express API route module.** Newly added module — narrative pending curation.

Size: roughly 582 lines of source.

## 2. Why does it exist?

Newly introduced as part of recent development; see source and git history for the introducing commit.

## 3. What does it do?


### Endpoints (10)

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/mewacho/groups` | auth | 98 |
| `POST` | `/api/mewacho/groups` | auth | 121 |
| `GET` | `/api/mewacho/groups/join/:invite_code` | auth | 159 |
| `GET` | `/api/mewacho/groups/:id` | auth | 191 |
| `POST` | `/api/mewacho/groups/:id/contribute` | auth | 265 |
| `POST` | `/api/mewacho/groups/:id/message` | auth | 347 |
| `POST` | `/api/mewacho/groups/:id/withdraw` | auth | 370 |
| `PUT` | `/api/mewacho/withdrawals/:wid/approve` | auth | 448 |
| `PUT` | `/api/mewacho/withdrawals/:wid/reject` | auth | 484 |
| `POST` | `/api/mewacho/webhook` | public | 510 |

## 4. What does it touch?

**Source:** `backend/routes/mewacho.ts`
