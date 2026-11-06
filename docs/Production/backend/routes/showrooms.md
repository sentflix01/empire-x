# backend/routes/showrooms.ts

## 1. What is this?

**Express API route module.** Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## 2. Why does it exist?

Showroom CRUD: draft/publish lifecycle, layout template selection, section content persistence, cover/branding assets, slug-based public access.

## 3. What does it do?


### Endpoints (12)

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/showrooms/` | optional | 21 |
| `GET` | `/api/showrooms/slug/:slug` | optional | 49 |
| `POST` | `/api/showrooms/:id/recheck/:sectionKey` | auth | 67 |
| `GET` | `/api/showrooms/:id/doctor` | auth | 92 |
| `GET` | `/api/showrooms/sitemap-data` | public | 149 |
| `POST` | `/api/showrooms/:id/newsletter` | optional | 169 |
| `GET` | `/api/showrooms/:id/newsletter` | auth | 187 |
| `PATCH` | `/api/showrooms/:id/spotlight` | auth | 200 |
| `GET` | `/api/showrooms/:id` | optional | 238 |
| `POST` | `/api/showrooms/` | auth | 251 |
| `PUT` | `/api/showrooms/:id` | auth | 317 |
| `DELETE` | `/api/showrooms/:id` | auth | 378 |

## 4. What does it touch?

**Notes:**
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

**Machine catalog:** `backend/api-catalog.json` (regenerate: `npm run docs:api`).

**Contract:** follows the standard handler pipeline — see `../index.md`.
