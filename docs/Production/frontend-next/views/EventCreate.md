# frontend-next/views/EventCreate.tsx

> Event authoring form: schedule, venue/map link, ticketing setup.

## Facts
- Size: ~85 lines (view-layer logic; thin page wrapper delegates here)
- API endpoints touched:
  - `/api/entities`
- State / realtime: AuthContext (useAuth), zustand stores

## Notes
- Client component (interactive UI); server data via axios client with silent token refresh.
- Errors surface through sonner toasts; auth failures are handled globally by api/client interceptors.
