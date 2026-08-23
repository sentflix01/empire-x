# backend/routes/returns.ts - Return requests: buyer opens return with reason/images, seller respond window, admin approve/reject endpoints (approve notifies - refund itself is executed manually via wallet/refund).

> Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## Endpoints (5)

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/returns/` | auth | 10 |
| `GET` | `/api/returns/seller` | auth | 21 |
| `POST` | `/api/returns/` | auth | 33 |
| `PUT` | `/api/returns/:id/approve` | auth | 58 |
| `PUT` | `/api/returns/:id/reject` | auth | 78 |

## Notes
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

