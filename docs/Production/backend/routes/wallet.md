# backend/routes/wallet.ts - Wallet money movement: balance + transaction history, admin-only topup/debit/refund in production, withdrawal request flow, Chapa top-up initialize + concurrency-safe verify callback, Stripe topup session.

> Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## Endpoints (9)

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/wallet/me` | auth | 63 |
| `POST` | `/api/wallet/topup` | auth | 74 |
| `POST` | `/api/wallet/withdraw` | auth | 87 |
| `POST` | `/api/wallet/debit` | auth | 100 |
| `POST` | `/api/wallet/refund` | auth | 113 |
| `POST` | `/api/wallet/topup/chapa` | auth | 128 |
| `GET` | `/api/wallet/topup/chapa/sandbox` | public | 164 |
| `GET` | `/api/wallet/topup/chapa/verify/:tx_ref` | public | 178 |
| `POST` | `/api/wallet/topup/stripe` | auth | 242 |

## Notes
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

