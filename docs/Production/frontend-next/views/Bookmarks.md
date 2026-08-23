# frontend-next/views/Bookmarks.tsx

## 1. What is this?

**Screen component (view layer).** Saved items grid fed by the zustand bookmarks store hydration endpoint.

Size: roughly 205 lines of source.

## 2. Why does it exist?

Saved items grid fed by the zustand bookmarks store hydration endpoint.

## 3. What does it do?

Implements the behavior described above as an interactive client-side module:
data flows through `api/client.ts` (silent token refresh), errors surface via
sonner toasts, and auth failures are handled globally by interceptors.

## 4. What does it touch?

**API endpoints:**
- `/api/client`
- `/api/wishlists/price-alerts`
- `/api/wishlists/price-alerts/${productId}`

**Source file:** `frontend-next/views/Bookmarks`
