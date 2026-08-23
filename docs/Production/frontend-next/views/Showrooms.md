# frontend-next/views/Showrooms.tsx

> Showroom directory browsing published storefronts.

## Facts
- Size: ~146 lines (view-layer logic; thin page wrapper delegates here)
- API endpoints touched:
  - `/api/entities`

## Notes
- Client component (interactive UI); server data via axios client with silent token refresh.
- Errors surface through sonner toasts; auth failures are handled globally by api/client interceptors.
