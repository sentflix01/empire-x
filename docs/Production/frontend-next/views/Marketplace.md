# frontend-next/views/Marketplace.tsx

> Product browsing grid with category filters, search, sorting and product cards linking to detail pages.

## Facts
- Size: ~240 lines (view-layer logic; thin page wrapper delegates here)
- API endpoints touched:
  - `/api/entities`
  - `/api/client`
  - `/api/products`
- State / realtime: AuthContext (useAuth)

## Notes
- Client component (interactive UI); server data via axios client with silent token refresh.
- Errors surface through sonner toasts; auth failures are handled globally by api/client interceptors.
