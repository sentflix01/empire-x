# frontend-next/lib/useChatPresence.ts

> Hook tracking online/typing state across ChatRoom instances.

## Facts
- Size: ~49 lines
- API endpoints touched:
  - `/api/client`
  - `/api/messages/presence`

## Notes
- Client-side module; auth handled globally by api/client interceptors.
