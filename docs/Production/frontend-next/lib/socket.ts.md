# frontend-next/lib/socket.ts

> Socket.IO singleton with SSRF-safe stub during SSR; injects current access token on connect.

## Facts
- Size: ~41 lines
- API endpoints touched:
  - `/api/client`
- Integrations: Socket.IO

## Notes
- Client-side module; auth handled globally by api/client interceptors.
