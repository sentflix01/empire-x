# backend/routes/moderation.ts

## 1. What is this?

**Express API route module.** Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## 2. Why does it exist?

Trust-and-safety primitives: report content/user, blocklist management, admin moderation queue actions.

## 3. What does it do?


### Endpoints (3)

| Method | Path | Auth | Line |
|---|---|---|---|
| `POST` | `/api/moderation/report` | auth | 8 |
| `GET` | `/api/moderation/reports` | admin | 26 |
| `PUT` | `/api/moderation/reports/:id` | admin | 42 |

## 4. What does it touch?

**Notes:**
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

**Machine catalog:** `backend/api-catalog.json` (regenerate: `npm run docs:api`).

**Contract:** follows the standard handler pipeline — see `../index.md`.
