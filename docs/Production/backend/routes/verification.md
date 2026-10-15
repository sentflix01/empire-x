# backend/routes/verification.ts

## 1. What is this?

**Express API route module.** Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## 2. Why does it exist?

Creator/business badge verification requests: submit selfie+ID references, admin approve/reject updating profile verification columns. NOTE schema drift bug tracked TD (routes write columns migrate13 lacks).

## 3. What does it do?


### Endpoints (6)

| Method | Path | Auth | Line |
|---|---|---|---|
| `POST` | `/api/verification/request` | auth | 13 |
| `GET` | `/api/verification/status` | auth | 51 |
| `GET` | `/api/verification/my-request` | auth | 71 |
| `GET` | `/api/verification/` | admin | 81 |
| `PUT` | `/api/verification/:id/approve` | admin | 94 |
| `PUT` | `/api/verification/:id/reject` | admin | 109 |

## 4. What does it touch?

**Notes:**
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

**Machine catalog:** `backend/api-catalog.json` (regenerate: `npm run docs:api`).

**Contract:** follows the standard handler pipeline — see `../index.md`.
