# backend/routes/showrooms.ts

## 1. What is this?

**Express API route module.** Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## 2. Why does it exist?

Showroom CRUD: draft/publish lifecycle, layout template selection, section content persistence, cover/branding assets, slug-based public access.

## 3. What does it do?


### Endpoints (9)

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/showrooms/` | optional | 13 |
| `GET` | `/api/showrooms/slug/:slug` | optional | 24 |
| `POST` | `/api/showrooms/:id/recheck/:sectionKey` | auth | 36 |
| `GET` | `/api/showrooms/:id/doctor` | auth | 61 |
| `GET` | `/api/showrooms/sitemap-data` | public | 118 |
| `GET` | `/api/showrooms/:id` | optional | 128 |
| `POST` | `/api/showrooms/` | auth | 136 |
| `PUT` | `/api/showrooms/:id` | auth | 153 |
| `DELETE` | `/api/showrooms/:id` | auth | 164 |

## 4. What does it touch?

**Notes:**
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

**Machine catalog:** `backend/api-catalog.json` (regenerate: `npm run docs:api`).

**Contract:** follows the standard handler pipeline — see `../index.md`.
