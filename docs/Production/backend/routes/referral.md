# backend/routes/referral.ts - Referral program: referral codes, attribution on signup, reward point issuance ledger (point_transactions).

> Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## Endpoints (2)

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/referral/my-code` | auth | 8 |
| `POST` | `/api/referral/use` | public | 27 |

## Notes
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

