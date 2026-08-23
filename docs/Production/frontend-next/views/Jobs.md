# frontend-next/views/Jobs.tsx

> Job board listing with search/filter and apply flow.

## Facts
- Size: ~124 lines (view-layer logic; thin page wrapper delegates here)
- API endpoints touched:
  - `/api/entities`
  - `/api/client`
  - `/api/jobs/${job.id}/apply`
- State / realtime: AuthContext (useAuth)

## Notes
- Client component (interactive UI); server data via axios client with silent token refresh.
- Errors surface through sonner toasts; auth failures are handled globally by api/client interceptors.
