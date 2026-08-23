# frontend-next/lib/AuthContext.tsx

> Auth state provider: boot re-hydration via silent refresh (TD-014), user/isAuthenticated flags, logout with server revocation. Real null-guarded context.

## Facts
- Size: ~118 lines
- API endpoints touched:
  - `/api/client`
  - `/api/auth/me`
  - `/api/auth/logout`
- Integrations: useAuth

## Notes
- Client-side module; auth handled globally by api/client interceptors.
