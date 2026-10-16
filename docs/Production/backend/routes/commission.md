# backend/routes/commission.ts

## 1. What is this?

**Express API route module.** Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## 2. Why does it exist?

Commission ledger access: seller-facing commission history and platform-wide totals for admins; rate fixed 3 percent via COMMISSION_RATE env (services/commission.ts performs the debit).

## 3. What does it do?


### Endpoints (2)

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/commission/my-commissions` | auth | 19 |
| `GET` | `/api/commission/admin/summary` | admin | 30 |

## 4. What does it touch?

**Notes:**
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

**Machine catalog:** `backend/api-catalog.json` (regenerate: `npm run docs:api`).

**Contract:** follows the standard handler pipeline — see `../index.md`.
