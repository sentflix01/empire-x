# frontend-next/views/Admin.tsx

> Admin control center: stats overview, user management (ban/unban), verifications queue, revenue charts, content tables.

## Facts
- Size: ~962 lines (view-layer logic; thin page wrapper delegates here)
- API endpoints touched:
  - `/api/client`
  - `/api/devops/stats`
  - `/api/flags`
  - `/api/flags/${name}`
  - `/api/admin/stats`
  - `/api/admin/users`
  - `/api/admin/verifications`
  - `/api/admin/posts`
- State / realtime: AuthContext (useAuth)

## Notes
- Client component (interactive UI); server data via axios client with silent token refresh.
- Errors surface through sonner toasts; auth failures are handled globally by api/client interceptors.
