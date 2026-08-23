# frontend-next/views/AccountSettings.tsx

> Account-level preferences: email/password change, connected Google, session logout-all.

## Facts
- Size: ~239 lines (view-layer logic; thin page wrapper delegates here)
- API endpoints touched:
  - `/api/client`
  - `/api/entities`
  - `/api/auth/change-password`
  - `/api/messages/presence/settings`
- State / realtime: AuthContext (useAuth)

## Notes
- Client component (interactive UI); server data via axios client with silent token refresh.
- Errors surface through sonner toasts; auth failures are handled globally by api/client interceptors.
