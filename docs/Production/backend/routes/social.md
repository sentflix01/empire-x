# backend/routes/social

<!-- AUTO-STUB  2026-10-18 — curate narrative below -->

## 1. What is this?

**Express API route module.** Newly added module — narrative pending curation.

Size: roughly 180 lines of source.

## 2. Why does it exist?

Newly introduced as part of recent development; see source and git history for the introducing commit.

## 3. What does it do?


### Endpoints (10)

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/social/relationship/:userId` | auth | 35 |
| `PUT` | `/api/social/mute/:userId` | auth | 74 |
| `DELETE` | `/api/social/mute/:userId` | auth | 75 |
| `PUT` | `/api/social/restrict/:userId` | auth | 78 |
| `DELETE` | `/api/social/restrict/:userId` | auth | 79 |
| `PUT` | `/api/social/block/:userId` | auth | 82 |
| `DELETE` | `/api/social/block/:userId` | auth | 107 |
| `GET` | `/api/social/people` | auth | 117 |
| `GET` | `/api/social/privacy` | auth | 147 |
| `PUT` | `/api/social/privacy` | auth | 155 |

## 4. What does it touch?

**Source:** `backend/routes/social.ts`
