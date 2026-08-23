# backend/routes/returns.ts

## 1. What is this?

**Express API route module.** Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## 2. Why does it exist?

Return requests: buyer opens return with reason/images, seller respond window, admin approve/reject endpoints (approve notifies - refund itself is executed manually via wallet/refund).

## 3. What does it do?

### Endpoints

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/returns/` | auth | 10 |
| `GET` | `/api/returns/seller` | auth | 21 |
| `POST` | `/api/returns/` | auth | 33 |
| `PUT` | `/api/returns/:id/approve` | auth | 58 |
| `PUT` | `/api/returns/:id/reject` | auth | 78 |


## 4. What does it touch?

**Notes:**
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

**Machine catalog:** `backend/api-catalog.json` (regenerate: `npm run docs:api`).

**Contract:** follows the standard handler pipeline — see `../index.md`.
