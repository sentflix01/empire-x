# frontend-next/views/Explore.tsx

> Discovery hub mixing trending content, suggested users and hashtags — the browsing surface for new connections.

## Facts
- Size: ~207 lines (view-layer logic; thin page wrapper delegates here)
- API endpoints touched:
  - `/api/client`
  - `/api/trending`
  - `/api/hashtags/trending`
- State / realtime: AuthContext (useAuth)

## Notes
- Client component (interactive UI); server data via axios client with silent token refresh.
- Errors surface through sonner toasts; auth failures are handled globally by api/client interceptors.
