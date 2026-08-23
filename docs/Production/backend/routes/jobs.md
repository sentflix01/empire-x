# backend/routes/jobs.ts - Job board: job posting CRUD, application submission with resume links, applicant tracking states for employers.

> Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## Endpoints (8)

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/jobs/` | optional | 9 |
| `GET` | `/api/jobs/:id` | optional | 20 |
| `POST` | `/api/jobs/` | auth | 28 |
| `PUT` | `/api/jobs/:id` | auth | 36 |
| `DELETE` | `/api/jobs/:id` | auth | 45 |
| `POST` | `/api/jobs/:id/apply` | auth | 55 |
| `GET` | `/api/jobs/:id/applications` | auth | 70 |
| `PUT` | `/api/jobs/applications/:id` | auth | 83 |

## Notes
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

