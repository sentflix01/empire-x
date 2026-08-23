# backend/routes/suggestions.ts

## 1. What is this?

**Express API route module.** Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## 2. Why does it exist?

People-you-may-know: suggestionScore-ranked candidate list excluding existing follows/blocked.

## 3. What does it do?


### Endpoints (2)

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/suggestions/people` | auth | 9 |
| `POST` | `/api/suggestions/dismiss/:targetUserId` | auth | 73 |

## 4. What does it touch?

**Notes:**
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

**Machine catalog:** `backend/api-catalog.json` (regenerate: `npm run docs:api`).

**Contract:** follows the standard handler pipeline — see `../index.md`.
