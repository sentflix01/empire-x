# frontend-next/views/PrivacyAndSecurity.tsx

> Privacy controls surface: data download request, blocklist management, security status.

## Facts
- Size: ~301 lines (view-layer logic; thin page wrapper delegates here)
- API endpoints touched:
  - `/api/client`
  - `/api/messages/presence/settings`
  - `/api/auth/me`
- State / realtime: AuthContext (useAuth)

## Notes
- Client component (interactive UI); server data via axios client with silent token refresh.
- Errors surface through sonner toasts; auth failures are handled globally by api/client interceptors.
