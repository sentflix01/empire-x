# backend/routes/showrooms.ts

## 1. What is this?

**Express API route module.** Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## 2. Why does it exist?

Showroom CRUD: draft/publish lifecycle, layout template selection, section content persistence, cover/branding assets, slug-based public access.

## 3. What does it do?


### Endpoints (8)

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/showrooms/` | optional | 13 |
| `GET` | `/api/showrooms/slug/:slug` | optional | 24 |
| `POST` | `/api/showrooms/:id/recheck/:sectionKey` | auth | 35 |
| `GET` | `/api/showrooms/:id/doctor` | auth | 60 |
| `GET` | `/api/showrooms/:id` | optional | 116 |
| `POST` | `/api/showrooms/` | auth | 124 |
| `PUT` | `/api/showrooms/:id` | auth | 140 |
| `DELETE` | `/api/showrooms/:id` | auth | 149 |

## 4. What does it touch?

**Notes:**
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

**Machine catalog:** `backend/api-catalog.json` (regenerate: `npm run docs:api`).

**Contract:** follows the standard handler pipeline — see `../index.md`.
