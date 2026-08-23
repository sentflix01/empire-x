# frontend-next/views/Tasks.tsx

> Task/gig marketplace browser with filters and bid entry points.

## Facts
- Size: ~178 lines (view-layer logic; thin page wrapper delegates here)
- API endpoints touched:
  - `/api/entities`
- State / realtime: AuthContext (useAuth)

## Notes
- Client component (interactive UI); server data via axios client with silent token refresh.
- Errors surface through sonner toasts; auth failures are handled globally by api/client interceptors.
