# frontend-next/lib/useChatPresence.ts

## 1. What is this?

**Shared frontend library.** Hook tracking online/typing state across ChatRoom instances.

Size: roughly 49 lines of source.

## 2. Why does it exist?

Hook tracking online/typing state across ChatRoom instances.

## 3. What does it do?

Implements the behavior described above as an interactive client-side module:
data flows through `api/client.ts` (silent token refresh), errors surface via
sonner toasts, and auth failures are handled globally by interceptors.

## 4. What does it touch?

**API endpoints:**
- `/api/client`
- `/api/messages/presence`

**Source file:** `frontend-next/lib/useChatPresence.ts`
