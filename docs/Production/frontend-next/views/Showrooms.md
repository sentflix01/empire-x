# frontend-next/views/Showrooms.tsx

## 1. What is this?

**Screen component (view layer).** Showroom directory browsing published storefronts.

Size: roughly 146 lines of source.

## 2. Why does it exist?

Showroom directory browsing published storefronts.

## 3. What does it do?

Implements the behavior described above as an interactive client-side module:
data flows through `api/client.ts` (silent token refresh), errors surface via
sonner toasts, and auth failures are handled globally by interceptors.

## 4. What does it touch?

**API endpoints:**
- `/api/entities`

**Source file:** `frontend-next/views/Showrooms`
