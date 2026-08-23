# frontend-next/lib/media.ts

## 1. What is this?

**Shared frontend library.** Media URL helpers resolving provider URLs to displayable sources.

Size: roughly 30 lines of source.

## 2. Why does it exist?

Media URL helpers resolving provider URLs to displayable sources.

## 3. What does it do?

Implements the behavior described above as an interactive client-side module:
data flows through `api/client.ts` (silent token refresh), errors surface via
sonner toasts, and auth failures are handled globally by interceptors.

## 4. What does it touch?

**Source file:** `frontend-next/lib/media.ts`
