# frontend-next/components/tasks/BidModal.tsx

## 1. What is this?

**React component.** Bid submission modal for gig tasks.

Size: roughly 72 lines of source.

## 2. Why does it exist?

Bid submission modal for gig tasks.

## 3. What does it do?

Implements the behavior described above as an interactive client-side module:
data flows through `api/client.ts` (silent token refresh), errors surface via
sonner toasts, and auth failures are handled globally by interceptors.

## 4. What does it touch?

**API endpoints:**
- `/api/entities`

**Integrations:** zustand

**Source file:** `frontend-next/components/tasks/BidModal.tsx`
