# frontend-next/lib/CartContext.tsx

## 1. What is this?

**Shared frontend library.** Module of the frontend application.

Size: roughly 82 lines of source.

## 2. Why does it exist?

Module of the frontend application.

## 3. What does it do?

Implements the behavior described above as an interactive client-side module:
data flows through `api/client.ts` (silent token refresh), errors surface via
sonner toasts, and auth failures are handled globally by interceptors.

## 4. What does it touch?

**Integrations:** useAuth

**Source file:** `frontend-next/lib/CartContext.tsx`
