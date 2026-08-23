# frontend-next/components/map/HomeMapTab.tsx

## 1. What is this?

**React component.** Module of the frontend application.

Size: roughly 855 lines of source.

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
- `/api/maps/nearby/businesses`
- `/api/search`
- `/api/maps/nearby/product-search`

**Source file:** `frontend-next/components/map/HomeMapTab.tsx`
