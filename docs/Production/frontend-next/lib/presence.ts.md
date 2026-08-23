# frontend-next/lib/presence.ts

## 1. What is this?

**Shared frontend library.** Presence helpers shared with socket events (formatLastSeen, isUserOnline).

Size: roughly 229 lines of source.

## 2. Why does it exist?

Presence helpers shared with socket events (formatLastSeen, isUserOnline).

## 3. What does it do?

Implements the behavior described above as an interactive client-side module:
data flows through `api/client.ts` (silent token refresh), errors surface via
sonner toasts, and auth failures are handled globally by interceptors.

## 4. What does it touch?

**Source file:** `frontend-next/lib/presence.ts`
