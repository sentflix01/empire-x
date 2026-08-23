# frontend-next/views/Orders.tsx

> Order history for buyer and seller roles with status badges and timeline links into delivery tracking.

## Facts
- Size: ~588 lines (view-layer logic; thin page wrapper delegates here)
- API endpoints touched:
  - `/api/entities`
  - `/api/client`
  - `/api/delivery/${orderId}`
  - `/api/returns`
  - `/api/returns/${rr.id}`
  - `/api/profiles`
- State / realtime: AuthContext (useAuth)

## Notes
- Client component (interactive UI); server data via axios client with silent token refresh.
- Errors surface through sonner toasts; auth failures are handled globally by api/client interceptors.
