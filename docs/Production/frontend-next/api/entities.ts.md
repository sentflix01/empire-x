# frontend-next/api/entities.ts

> Typed entity CRUD wrappers over axios (UserProfile/Product/etc.) used across views.

## Facts
- Size: ~370 lines
- API endpoints touched:
  - `/api/${path}`
  - `/api/${path}/${id}`
  - `/api/messages/conversations`
  - `/api/messages/conversations/${id}`
  - `/api/messages/conversations/${filterObj.conversation_id}/messages`
  - `/api/messages/conversations/${conversation_id}/messages`
- Integrations: zustand

## Notes
- Client-side module; auth handled globally by api/client interceptors.
