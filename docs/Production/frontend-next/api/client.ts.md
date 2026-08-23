# frontend-next/api/client.ts

> Axios singleton: memory-only JWT, silent refresh dedupe, nb_auth hint cookie, normalized errors/timeouts. THE transport every call uses.

## Facts
- Size: ~178 lines
- API endpoints touched:
  - `/api/auth/refresh`
  - `/api/auth/`
  - `/api/auth/me`
  - `/api/auth/login`
  - `/api/auth/logout`
- Integrations: zustand

## Notes
- Client-side module; auth handled globally by api/client interceptors.
