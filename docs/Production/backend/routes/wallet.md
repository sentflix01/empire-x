# backend/routes/wallet.ts

## 1. What is this?

**Express API route module.** Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## 2. Why does it exist?

Wallet money movement: balance + transaction history, admin-only topup/debit/refund in production, withdrawal request flow, Chapa top-up initialize + concurrency-safe verify callback, Stripe topup session.

## 3. What does it do?


### Endpoints (9)

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/wallet/me` | auth | 82 |
| `POST` | `/api/wallet/topup` | auth | 93 |
| `POST` | `/api/wallet/withdraw` | auth | 106 |
| `POST` | `/api/wallet/debit` | auth | 119 |
| `POST` | `/api/wallet/refund` | auth | 132 |
| `POST` | `/api/wallet/topup/chapa` | auth | 147 |
| `GET` | `/api/wallet/topup/chapa/sandbox` | public | 183 |
| `GET` | `/api/wallet/topup/chapa/verify/:tx_ref` | public | 197 |
| `POST` | `/api/wallet/topup/stripe` | auth | 264 |

## 4. What does it touch?

**Notes:**
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

**Machine catalog:** `backend/api-catalog.json` (regenerate: `npm run docs:api`).

**Contract:** follows the standard handler pipeline — see `../index.md`.
