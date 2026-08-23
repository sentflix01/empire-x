# frontend-next/views/ProfileEdit.tsx

> Deep profile editor across personal/business tabs: identity fields, social links, template picker, verification request entry point.

## Facts
- Size: ~795 lines (view-layer logic; thin page wrapper delegates here)
- API endpoints touched:
  - `/api/entities`
- State / realtime: AuthContext (useAuth), zustand stores

## Notes
- Client component (interactive UI); server data via axios client with silent token refresh.
- Errors surface through sonner toasts; auth failures are handled globally by api/client interceptors.
