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
| `GET` | `/api/social/relationship/:userId` | auth | 34 |
| `PUT` | `/api/social/mute/:userId` | auth | 73 |
| `DELETE` | `/api/social/mute/:userId` | auth | 74 |
| `PUT` | `/api/social/restrict/:userId` | auth | 77 |
| `DELETE` | `/api/social/restrict/:userId` | auth | 78 |
| `PUT` | `/api/social/block/:userId` | auth | 81 |
| `DELETE` | `/api/social/block/:userId` | auth | 106 |
| `GET` | `/api/social/people` | auth | 116 |
| `GET` | `/api/social/privacy` | auth | 145 |
| `PUT` | `/api/social/privacy` | auth | 153 |

## 4. What does it touch?

**Source:** `backend/routes/social.ts`
