# frontend-next/store/authSlice.ts

> Zustand auth slice mirroring AuthContext hydration via ensureFreshToken.

## Facts
- Size: ~71 lines
- API endpoints touched:
  - `/api/client`
  - `/api/auth/me`
  - `/api/auth/logout`
- Integrations: zustand

## Notes
- Client-side module; auth handled globally by api/client interceptors.
