# backend/routes/admin.ts

## 1. What is this?

**Express API route module.** Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## 2. Why does it exist?

Platform administration: dashboard stats aggregation, user ban/unban + role changes (evicts auth cache), verification review approvals, revenue stats, content takedown tools. requireAdmin everywhere.

## 3. What does it do?


### Endpoints (19)

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/admin/stats` | public | 24 |
| `GET` | `/api/admin/users` | public | 52 |
| `PUT` | `/api/admin/users/:id/role` | public | 85 |
| `DELETE` | `/api/admin/users/:id` | public | 106 |
| `POST` | `/api/admin/users/:id/ban` | public | 134 |
| `POST` | `/api/admin/users/:id/unban` | public | 160 |
| `GET` | `/api/admin/verifications` | public | 173 |
| `POST` | `/api/admin/verifications/:userId` | public | 188 |
| `DELETE` | `/api/admin/verifications/:userId` | public | 207 |
| `GET` | `/api/admin/posts` | public | 219 |
| `DELETE` | `/api/admin/posts/:id` | public | 233 |
| `GET` | `/api/admin/products` | public | 246 |
| `DELETE` | `/api/admin/products/:id` | public | 260 |
| `GET` | `/api/admin/orders` | public | 266 |
| `GET` | `/api/admin/reports` | public | 281 |
| `PUT` | `/api/admin/reports/:id` | public | 290 |
| `PUT` | `/api/admin/users/:id/verify` | public | 298 |
| `GET` | `/api/admin/stats/revenue` | public | 306 |
| `GET` | `/api/admin/audit-logs` | public | 326 |

## 4. What does it touch?

**Notes:**
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

**Machine catalog:** `backend/api-catalog.json` (regenerate: `npm run docs:api`).

**Contract:** follows the standard handler pipeline — see `../index.md`.
