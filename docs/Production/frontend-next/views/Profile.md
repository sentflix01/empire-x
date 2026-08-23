# frontend-next/views/Profile.tsx

> Public/private profile view: cover/avatar, social links, tabs over posts/products/showrooms, follow button, verification badge display.

## Facts
- Size: ~352 lines (view-layer logic; thin page wrapper delegates here)
- API endpoints touched:
  - `/api/auth`
  - `/api/entities`
  - `/api/client`
  - `/api/profiles/me/ticker`
- State / realtime: AuthContext (useAuth)

## Notes
- Client component (interactive UI); server data via axios client with silent token refresh.
- Errors surface through sonner toasts; auth failures are handled globally by api/client interceptors.
