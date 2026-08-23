# frontend-next/views/Businesses.tsx

> Business directory/listing management for owners.

## Facts
- Size: ~390 lines (view-layer logic; thin page wrapper delegates here)
- API endpoints touched:
  - `/api/client`
  - `/api/auth/me`
  - `/api/profiles/me/follows`
  - `/api/businesses`
  - `/api/profiles/by-user/${uid}`

## Notes
- Client component (interactive UI); server data via axios client with silent token refresh.
- Errors surface through sonner toasts; auth failures are handled globally by api/client interceptors.
