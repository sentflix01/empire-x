# frontend-next/api/entities.ts

## 1. What is this?

**API client module.** Typed entity CRUD wrappers over axios (UserProfile/Product/etc.) used across views.

Size: roughly 370 lines of source.

## 2. Why does it exist?

Typed entity CRUD wrappers over axios (UserProfile/Product/etc.) used across views.

## 3. What does it do?

Implements the behavior described above as an interactive client-side module:
data flows through `api/client.ts` (silent token refresh), errors surface via
sonner toasts, and auth failures are handled globally by interceptors.

## 4. What does it touch?

**API endpoints:**
- `/api/${path}`
- `/api/${path}/${id}`
- `/api/messages/conversations`
- `/api/messages/conversations/${id}`
- `/api/messages/conversations/${filterObj.conversation_id}/messages`
- `/api/messages/conversations/${conversation_id}/messages`

**Integrations:** zustand

**Source file:** `frontend-next/api/entities.ts`
