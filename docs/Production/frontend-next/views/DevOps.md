# frontend-next/views/DevOps.tsx

> Developer operations console: bugs/features board, live error feed polling, version board, docs library search.

## Facts
- Size: ~2153 lines (view-layer logic; thin page wrapper delegates here)
- API endpoints touched:
  - `/api/client`
  - `/api/docs`
  - `/api/docs/library`
  - `/api/docs/search`
  - `/api/docs/strategy/versions`
  - `/api/docs/implementation`
  - `/api/docs/notes`
  - `/api/docs/progress`
- State / realtime: AuthContext (useAuth)

## Notes
- Client component (interactive UI); server data via axios client with silent token refresh.
- Errors surface through sonner toasts; auth failures are handled globally by api/client interceptors.
