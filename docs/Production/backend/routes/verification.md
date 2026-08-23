# backend/routes/verification.ts - Creator/business badge verification requests: submit selfie+ID references, admin approve/reject updating profile verification columns. NOTE schema drift bug tracked TD (routes write columns migrate13 lacks).

> Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## Endpoints (5)

| Method | Path | Auth | Line |
|---|---|---|---|
| `POST` | `/api/verification/request` | auth | 8 |
| `GET` | `/api/verification/my-request` | auth | 28 |
| `GET` | `/api/verification/` | admin | 38 |
| `PUT` | `/api/verification/:id/approve` | admin | 51 |
| `PUT` | `/api/verification/:id/reject` | admin | 66 |

## Notes
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

