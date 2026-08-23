# frontend-next/lib/push.ts

> Service-worker push subscribe/unsubscribe against push_subscriptions API.

## Facts
- Size: ~96 lines
- API endpoints touched:
  - `/api/client`
  - `/api/push/vapid-public-key`
  - `/api/push/subscribe`

## Notes
- Client-side module; auth handled globally by api/client interceptors.
