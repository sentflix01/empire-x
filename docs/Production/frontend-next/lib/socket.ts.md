# frontend-next/lib/socket.ts

## 1. What is this?

**Shared frontend library.** Socket.IO singleton with SSRF-safe stub during SSR; injects current access token on connect.

Size: roughly 41 lines of source.

## 2. Why does it exist?

Socket.IO singleton with SSRF-safe stub during SSR; injects current access token on connect.

## 3. What does it do?

Implements the behavior described above as an interactive client-side module:
data flows through `api/client.ts` (silent token refresh), errors surface via
sonner toasts, and auth failures are handled globally by interceptors.

## 4. What does it touch?

**API endpoints:**
- `/api/client`

**Integrations:** Socket.IO

**Source file:** `frontend-next/lib/socket.ts`
