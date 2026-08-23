# frontend-next/views/BusinessAnalytics.tsx

> Seller analytics dashboard: orders/revenue/views charts over business data.

## Facts
- Size: ~477 lines (view-layer logic; thin page wrapper delegates here)
- API endpoints touched:
  - `/api/entities`
- State / realtime: AuthContext (useAuth)

## Notes
- Client component (interactive UI); server data via axios client with silent token refresh.
- Errors surface through sonner toasts; auth failures are handled globally by api/client interceptors.
