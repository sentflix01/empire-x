# frontend-next/views/Events.tsx

> Event discovery list plus ticket purchase/RSVP entry.

## Facts
- Size: ~122 lines (view-layer logic; thin page wrapper delegates here)
- API endpoints touched:
  - `/api/entities`
  - `/api/client`
  - `/api/events/${event.id}/book`
- State / realtime: AuthContext (useAuth)

## Notes
- Client component (interactive UI); server data via axios client with silent token refresh.
- Errors surface through sonner toasts; auth failures are handled globally by api/client interceptors.
