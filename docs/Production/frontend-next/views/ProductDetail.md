# frontend-next/views/ProductDetail.tsx

> Full product page: image gallery, price/stock/variants, seller card, reviews section, add-to-cart and buy actions opening PurchaseModal.

## Facts
- Size: ~319 lines (view-layer logic; thin page wrapper delegates here)
- API endpoints touched:
  - `/api/client`
  - `/api/wishlists/check/${id}`
  - `/api/wishlists/price-alerts`
  - `/api/products/${id}`
  - `/api/entities`
  - `/api/wishlists/${id}`
  - `/api/wishlists`
  - `/api/wishlists/price-alerts/${id}`
- State / realtime: AuthContext (useAuth), CartContext

## Notes
- Client component (interactive UI); server data via axios client with silent token refresh.
- Errors surface through sonner toasts; auth failures are handled globally by api/client interceptors.
