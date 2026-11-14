# backend/routes/verification.ts

## 1. What is this?

**Express API route module.** Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## 2. Why does it exist?

Creator/business badge verification requests: submit selfie+ID references, admin approve/reject updating profile verification columns. NOTE schema drift bug tracked TD (routes write columns migrate13 lacks).

## 3. What does it do?


### Endpoints (8)

| Method | Path | Auth | Line |
|---|---|---|---|
| `POST` | `/api/verification/documents` | auth | 62 |
| `POST` | `/api/verification/request` | auth | 79 |
| `GET` | `/api/verification/status` | auth | 127 |
| `GET` | `/api/verification/my-request` | auth | 147 |
| `GET` | `/api/verification/` | admin | 157 |
| `GET` | `/api/verification/:id/documents` | auth | 174 |
| `PUT` | `/api/verification/:id/approve` | admin | 197 |
| `PUT` | `/api/verification/:id/reject` | admin | 212 |

## 4. What does it touch?

**Notes:**
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

**Machine catalog:** `backend/api-catalog.json` (regenerate: `npm run docs:api`).

**Contract:** follows the standard handler pipeline — see `../index.md`.
