# backend/routes/flags.ts

## 1. What is this?

**Express API route module.** Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## 2. Why does it exist?

Public feature-flag exposure: returns effective flags for the calling user so the frontend can gate UI without secrets.

## 3. What does it do?


### Endpoints (3)

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/flags/` | auth | 8 |
| `GET` | `/api/flags/:name` | auth | 22 |
| `PUT` | `/api/flags/:name` | admin | 29 |

## 4. What does it touch?

**Notes:**
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

**Machine catalog:** `backend/api-catalog.json` (regenerate: `npm run docs:api`).

**Contract:** follows the standard handler pipeline — see `../index.md`.
