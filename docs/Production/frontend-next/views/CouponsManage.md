# frontend-next/views/CouponsManage.tsx

> Seller coupon manager: create discount codes, toggle active, usage stats.

## Facts
- Size: ~252 lines (view-layer logic; thin page wrapper delegates here)
- API endpoints touched:
  - `/api/client`
  - `/api/auth`
  - `/api/coupons/mine`
  - `/api/coupons`
  - `/api/coupons/${id}`
  - `/api/coupons/${id}/toggle`

## Notes
- Client component (interactive UI); server data via axios client with silent token refresh.
- Errors surface through sonner toasts; auth failures are handled globally by api/client interceptors.
