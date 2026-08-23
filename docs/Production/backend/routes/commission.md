# backend/routes/commission.ts - Commission ledger access: seller-facing commission history and platform-wide totals for admins; rate fixed 3 percent via COMMISSION_RATE env (services/commission.ts performs the debit).

> Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## Endpoints (2)

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/commission/my-commissions` | auth | 44 |
| `GET` | `/api/commission/admin/summary` | admin | 55 |

## Notes
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

