# frontend-next/views/ProductDetail.tsx

## 1. What is this?

**Screen component (view layer).** Full product page: image gallery, price/stock/variants, seller card, reviews section, add-to-cart and buy actions opening PurchaseModal.

Size: roughly 319 lines of source.

## 2. Why does it exist?

Full product page: image gallery, price/stock/variants, seller card, reviews section, add-to-cart and buy actions opening PurchaseModal.

## 3. What does it do?

Implements the behavior described above as an interactive client-side module:
data flows through `api/client.ts` (silent token refresh), errors surface via
sonner toasts, and auth failures are handled globally by interceptors.

## 4. What does it touch?

**API endpoints:**
- `/api/client`
- `/api/wishlists/check/${id}`
- `/api/wishlists/price-alerts`
- `/api/products/${id}`
- `/api/entities`
- `/api/wishlists/${id}`
- `/api/wishlists`
- `/api/wishlists/price-alerts/${id}`

**Integrations:** AuthContext (useAuth), CartContext

**Source file:** `frontend-next/views/ProductDetail`
