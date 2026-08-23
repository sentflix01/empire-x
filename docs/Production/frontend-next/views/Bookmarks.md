# frontend-next/views/Bookmarks.tsx

> Saved items grid fed by the zustand bookmarks store hydration endpoint.

## Facts
- Size: ~205 lines (view-layer logic; thin page wrapper delegates here)
- API endpoints touched:
  - `/api/client`
  - `/api/wishlists/price-alerts`
  - `/api/wishlists/price-alerts/${productId}`

## Notes
- Client component (interactive UI); server data via axios client with silent token refresh.
- Errors surface through sonner toasts; auth failures are handled globally by api/client interceptors.
