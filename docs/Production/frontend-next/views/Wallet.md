# frontend-next/views/Wallet.tsx

> Balance dashboard: current balance, transaction history, top-up entry points (Stripe/Chapa) and withdrawal request form.

## Facts
- Size: ~262 lines (view-layer logic; thin page wrapper delegates here)
- API endpoints touched:
  - `/api/client`
  - `/api/wallet/me`
  - `/api/wallet/topup`
  - `/api/wallet/withdraw`
  - `/api/wallet/topup/chapa`
  - `/api/wallet/topup/stripe`

## Notes
- Client component (interactive UI); server data via axios client with silent token refresh.
- Errors surface through sonner toasts; auth failures are handled globally by api/client interceptors.
