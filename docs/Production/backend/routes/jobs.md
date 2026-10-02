# backend/routes/jobs.ts

## 1. What is this?

**Express API route module.** Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## 2. Why does it exist?

Job board: job posting CRUD, application submission with resume links, applicant tracking states for employers.

## 3. What does it do?


### Endpoints (8)

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/jobs/` | optional | 9 |
| `GET` | `/api/jobs/:id` | optional | 20 |
| `POST` | `/api/jobs/` | auth | 28 |
| `PUT` | `/api/jobs/:id` | auth | 37 |
| `DELETE` | `/api/jobs/:id` | auth | 48 |
| `POST` | `/api/jobs/:id/apply` | auth | 58 |
| `GET` | `/api/jobs/:id/applications` | auth | 73 |
| `PUT` | `/api/jobs/applications/:id` | auth | 89 |

## 4. What does it touch?

**Notes:**
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

**Machine catalog:** `backend/api-catalog.json` (regenerate: `npm run docs:api`).

**Contract:** follows the standard handler pipeline — see `../index.md`.
