# frontend-next/views/Wallet.tsx

## 1. What is this?

**Screen component (view layer).** Balance dashboard: current balance, transaction history, top-up entry points (Stripe/Chapa) and withdrawal request form.

Size: roughly 262 lines of source.

## 2. Why does it exist?

Balance dashboard: current balance, transaction history, top-up entry points (Stripe/Chapa) and withdrawal request form.

## 3. What does it do?

Implements the behavior described above as an interactive client-side module:
data flows through `api/client.ts` (silent token refresh), errors surface via
sonner toasts, and auth failures are handled globally by interceptors.

## 4. What does it touch?

**API endpoints:**
- `/api/client`
- `/api/wallet/me`
- `/api/wallet/topup`
- `/api/wallet/withdraw`
- `/api/wallet/topup/chapa`
- `/api/wallet/topup/stripe`

**Source file:** `frontend-next/views/Wallet`
