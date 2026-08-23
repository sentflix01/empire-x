# frontend-next/views/ShowroomCreate.tsx

> Entry to the builder wizard — picks template/layout then routes into the showroom editor.

## Facts
- Size: ~906 lines (view-layer logic; thin page wrapper delegates here)
- API endpoints touched:
  - `/api/entities`
- State / realtime: AuthContext (useAuth), zustand stores

## Notes
- Client component (interactive UI); server data via axios client with silent token refresh.
- Errors surface through sonner toasts; auth failures are handled globally by api/client interceptors.
