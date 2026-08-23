# frontend-next/store/notificationsSlice.ts

## 1. What is this?

**State store slice.** Module of the frontend application.

Size: roughly 50 lines of source.

## 2. Why does it exist?

Module of the frontend application.

## 3. What does it do?

Implements the behavior described above as an interactive client-side module:
data flows through `api/client.ts` (silent token refresh), errors surface via
sonner toasts, and auth failures are handled globally by interceptors.

## 4. What does it touch?

**API endpoints:**
- `/api/client`
- `/api/notifications`

**Integrations:** zustand

**Source file:** `frontend-next/store/notificationsSlice.ts`
