# frontend-next/components/layout/AppLayout.tsx

> The app shell: responsive nav (sidebar desktop / bottom tabs mobile), header search, notification bell wiring, auth-gated layout wrapping every authenticated screen.

## Facts
- Size: ~976 lines
- API endpoints touched:
  - `/api/entities`
  - `/api/client`
  - `/api/trending/warm`
  - `/api/trending`
  - `/api/posts`
  - `/api/profiles`
- Integrations: useAuth, Socket.IO

## Notes
- Client-side module; auth handled globally by api/client interceptors.
