# frontend-next/lib/push.ts

## 1. What is this?

**Shared frontend library.** Service-worker push subscribe/unsubscribe against push_subscriptions API.

Size: roughly 96 lines of source.

## 2. Why does it exist?

Service-worker push subscribe/unsubscribe against push_subscriptions API.

## 3. What does it do?

Implements the behavior described above as an interactive client-side module:
data flows through `api/client.ts` (silent token refresh), errors surface via
sonner toasts, and auth failures are handled globally by interceptors.

## 4. What does it touch?

**API endpoints:**
- `/api/client`
- `/api/push/vapid-public-key`
- `/api/push/subscribe`

**Source file:** `frontend-next/lib/push.ts`
