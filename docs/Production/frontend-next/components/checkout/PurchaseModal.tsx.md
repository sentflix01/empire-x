# frontend-next/components/checkout/PurchaseModal.tsx

> The buy box modal: quantity, delivery info, coupon validation, Stripe redirect or Chapa window + status polling (TD-015 fixed), COD fallback.

## Facts
- Size: ~390 lines
- API endpoints touched:
  - `/api/entities`
  - `/api/client`
  - `/api/orders/chapa/status/${chapaTxRef}`
  - `/api/coupons/validate`
  - `/api/orders/checkout/chapa`
  - `/api/orders/checkout/session`
- Integrations: zustand

## Notes
- Client-side module; auth handled globally by api/client interceptors.
