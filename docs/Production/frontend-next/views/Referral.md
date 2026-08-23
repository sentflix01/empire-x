# frontend-next/views/Referral.tsx

> Referral program screen: personal code, share links, reward ledger.

## Facts
- Size: ~220 lines (view-layer logic; thin page wrapper delegates here)
- API endpoints touched:
  - `/api/client`
  - `/api/auth`
  - `/api/referral/my-code`
  - `/api/profiles/me`
  - `/api/referral/apply`

## Notes
- Client component (interactive UI); server data via axios client with silent token refresh.
- Errors surface through sonner toasts; auth failures are handled globally by api/client interceptors.
