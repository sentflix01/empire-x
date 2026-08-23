# frontend-next/views/CouponsManage.tsx

## 1. What is this?

**Screen component (view layer).** Seller coupon manager: create discount codes, toggle active, usage stats.

Size: roughly 252 lines of source.

## 2. Why does it exist?

Seller coupon manager: create discount codes, toggle active, usage stats.

## 3. What does it do?

Implements the behavior described above as an interactive client-side module:
data flows through `api/client.ts` (silent token refresh), errors surface via
sonner toasts, and auth failures are handled globally by interceptors.

## 4. What does it touch?

**API endpoints:**
- `/api/client`
- `/api/auth`
- `/api/coupons/mine`
- `/api/coupons`
- `/api/coupons/${id}`
- `/api/coupons/${id}/toggle`

**Source file:** `frontend-next/views/CouponsManage`
