# frontend-next/views/Onboarding.tsx

> Post-registration wizard collecting profile basics and interests before entering the app.

## Facts
- Size: ~267 lines (view-layer logic; thin page wrapper delegates here)
- API endpoints touched:
  - `/api/entities`
- State / realtime: AuthContext (useAuth), zustand stores

## Notes
- Client component (interactive UI); server data via axios client with silent token refresh.
- Errors surface through sonner toasts; auth failures are handled globally by api/client interceptors.
