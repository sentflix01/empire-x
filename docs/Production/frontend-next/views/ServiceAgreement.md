# frontend-next/views/ServiceAgreement.tsx

> Seller service agreement acceptance flow gating selling features.

## Facts
- Size: ~261 lines (view-layer logic; thin page wrapper delegates here)

## Notes
- Client component (interactive UI); server data via axios client with silent token refresh.
- Errors surface through sonner toasts; auth failures are handled globally by api/client interceptors.
