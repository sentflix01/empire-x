# backend/routes/courses.ts - Course marketplace: course/lesson authoring, enrollment (course_enrollments), lesson progression for students.

> Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## Endpoints (8)

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/courses/` | optional | 9 |
| `GET` | `/api/courses/:id` | optional | 18 |
| `POST` | `/api/courses/` | auth | 27 |
| `PUT` | `/api/courses/:id` | auth | 35 |
| `POST` | `/api/courses/:id/lessons` | auth | 44 |
| `POST` | `/api/courses/:id/enroll` | auth | 59 |
| `GET` | `/api/courses/:id/enrolled` | auth | 72 |
| `PUT` | `/api/courses/:id/progress` | auth | 79 |

## Notes
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

