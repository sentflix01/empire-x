# frontend-next/components/checkout/PurchaseModal.tsx

## 1. What is this?

**React component.** The buy box modal: quantity, delivery info, coupon validation, Stripe redirect or Chapa window + status polling (TD-015 fixed), COD fallback.

Size: roughly 390 lines of source.

## 2. Why does it exist?

The buy box modal: quantity, delivery info, coupon validation, Stripe redirect or Chapa window + status polling (TD-015 fixed), COD fallback.

## 3. What does it do?

Implements the behavior described above as an interactive client-side module:
data flows through `api/client.ts` (silent token refresh), errors surface via
sonner toasts, and auth failures are handled globally by interceptors.

## 4. What does it touch?

**API endpoints:**
- `/api/entities`
- `/api/client`
- `/api/orders/chapa/status/${chapaTxRef}`
- `/api/coupons/validate`
- `/api/orders/checkout/chapa`
- `/api/orders/checkout/session`

**Integrations:** zustand

**Source file:** `frontend-next/components/checkout/PurchaseModal.tsx`
