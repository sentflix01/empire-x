# backend/routes/admin.ts

## 1. What is this?

**Express API route module.** Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## 2. Why does it exist?

Platform administration: dashboard stats aggregation, user ban/unban + role changes (evicts auth cache), verification review approvals, revenue stats, content takedown tools. requireAdmin everywhere.

## 3. What does it do?


### Endpoints (19)

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/admin/stats` | public | 23 |
| `GET` | `/api/admin/users` | public | 53 |
| `PUT` | `/api/admin/users/:id/role` | public | 66 |
| `DELETE` | `/api/admin/users/:id` | public | 87 |
| `POST` | `/api/admin/users/:id/ban` | public | 115 |
| `POST` | `/api/admin/users/:id/unban` | public | 139 |
| `GET` | `/api/admin/verifications` | public | 152 |
| `POST` | `/api/admin/verifications/:userId` | public | 167 |
| `DELETE` | `/api/admin/verifications/:userId` | public | 186 |
| `GET` | `/api/admin/posts` | public | 198 |
| `DELETE` | `/api/admin/posts/:id` | public | 206 |
| `GET` | `/api/admin/products` | public | 219 |
| `DELETE` | `/api/admin/products/:id` | public | 227 |
| `GET` | `/api/admin/orders` | public | 233 |
| `GET` | `/api/admin/reports` | public | 242 |
| `PUT` | `/api/admin/reports/:id` | public | 251 |
| `PUT` | `/api/admin/users/:id/verify` | public | 259 |
| `GET` | `/api/admin/stats/revenue` | public | 267 |
| `GET` | `/api/admin/audit-logs` | public | 287 |

## 4. What does it touch?

**Notes:**
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

**Machine catalog:** `backend/api-catalog.json` (regenerate: `npm run docs:api`).

**Contract:** follows the standard handler pipeline — see `../index.md`.
