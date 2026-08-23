# frontend-next/views/Marketplace.tsx

## 1. What is this?

**Screen component (view layer).** Product browsing grid with category filters, search, sorting and product cards linking to detail pages.

Size: roughly 240 lines of source.

## 2. Why does it exist?

Product browsing grid with category filters, search, sorting and product cards linking to detail pages.

## 3. What does it do?

Implements the behavior described above as an interactive client-side module:
data flows through `api/client.ts` (silent token refresh), errors surface via
sonner toasts, and auth failures are handled globally by interceptors.

## 4. What does it touch?

**API endpoints:**
- `/api/entities`
- `/api/client`
- `/api/products`

**Integrations:** AuthContext (useAuth)

**Source file:** `frontend-next/views/Marketplace`
