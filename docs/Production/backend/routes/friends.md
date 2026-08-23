# backend/routes/friends.ts

## 1. What is this?

**Express API route module.** Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## 2. Why does it exist?

Friend graph operations: friend request send/accept/reject, friend list retrieval distinct from passive follows.

## 3. What does it do?


### Endpoints (1)

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/friends/mutual` | auth | 8 |

## 4. What does it touch?

**Notes:**
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

**Machine catalog:** `backend/api-catalog.json` (regenerate: `npm run docs:api`).

**Contract:** follows the standard handler pipeline — see `../index.md`.
