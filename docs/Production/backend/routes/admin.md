# backend/routes/admin.ts - Platform administration: dashboard stats aggregation, user ban/unban + role changes (evicts auth cache), verification review approvals, revenue stats, content takedown tools. requireAdmin everywhere.

> Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## Endpoints (18)

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/admin/stats` | public | 11 |
| `GET` | `/api/admin/users` | public | 41 |
| `PUT` | `/api/admin/users/:id/role` | public | 54 |
| `DELETE` | `/api/admin/users/:id` | public | 64 |
| `POST` | `/api/admin/users/:id/ban` | public | 73 |
| `POST` | `/api/admin/users/:id/unban` | public | 87 |
| `GET` | `/api/admin/verifications` | public | 100 |
| `POST` | `/api/admin/verifications/:userId` | public | 115 |
| `DELETE` | `/api/admin/verifications/:userId` | public | 134 |
| `GET` | `/api/admin/posts` | public | 146 |
| `DELETE` | `/api/admin/posts/:id` | public | 154 |
| `GET` | `/api/admin/products` | public | 167 |
| `DELETE` | `/api/admin/products/:id` | public | 175 |
| `GET` | `/api/admin/orders` | public | 181 |
| `GET` | `/api/admin/reports` | public | 190 |
| `PUT` | `/api/admin/reports/:id` | public | 199 |
| `PUT` | `/api/admin/users/:id/verify` | public | 207 |
| `GET` | `/api/admin/stats/revenue` | public | 215 |

## Notes
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

