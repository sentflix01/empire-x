# frontend-next/components/feed/BusinessShowroomFeed.tsx

## 1. What is this?

**React component.** Module of the frontend application.

Size: roughly 811 lines of source.

## 2. Why does it exist?

Module of the frontend application.

## 3. What does it do?

Implements the behavior described above as an interactive client-side module:
data flows through `api/client.ts` (silent token refresh), errors surface via
sonner toasts, and auth failures are handled globally by interceptors.

## 4. What does it touch?

**API endpoints:**
- `/api/entities`
- `/api/client`
- `/api/saves/check/${businessId}`
- `/api/saves/toggle`

**Source file:** `frontend-next/components/feed/BusinessShowroomFeed.tsx`
