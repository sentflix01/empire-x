# Cart & Checkout — Audit

## Current Architecture

- Cart stored in DB (`cart_items` table) — persists across devices ✅
- Backend: `GET/POST/PUT/DELETE /api/cart`
- Checkout: `POST /api/orders/checkout/session` → Stripe Hosted Checkout
- Chapa: `POST /api/orders/checkout/chapa` (feature-flagged)
- Webhook: `POST /api/orders/webhook` (Stripe events)
- Success page: `/orders/success?session_id=xxx`
- Cancel page: `/orders/cancel`

## Cart Page Requirements

| Element | Standard |
|---------|----------|
| Item image | 80×80px thumbnail |
| Item title | 1-2 lines, links to product |
| Item price | Unit price × quantity |
| Quantity control | − / count / + buttons, min 1, max stock |
| Remove button | Red trash icon, confirm not required |
| Seller name | Grouped by seller (multi-seller cart) |
| Subtotal | Updates instantly on quantity change |
| Coupon code input | With "Apply" button, shows discount line |
| Order total | Subtotal − Discount = Total |
| Checkout CTA | "Proceed to Checkout" — prominent |
| Empty cart | EmptyState component with "Shop Now" CTA |

## Checkout Flow (Global Standard — 3 steps max)

```
Step 1: Review Cart
  → item list + quantities + coupon field + total

Step 2: Delivery Details
  → full name (pre-filled), phone, delivery address, notes

Step 3: Payment
  → Stripe (card/wallet) button
  → Chapa (Telebirr/CBE/Bank) button (when feature-flagged on)
  → "Pay ETB X,XXX" CTA
```

## Post-Checkout

- Stripe: redirect to `/orders/success` → show order confirmation
- Order confirmation must show: order ID, items, total, estimated delivery
- Email confirmation sent automatically (backend handles this)

## Issues to Investigate

- [ ] Is the cart count shown in the navigation header?
- [ ] Does quantity update instantly (optimistic) or wait for server?
- [ ] Multi-seller cart: are items grouped by seller?
- [ ] Is the coupon system connected to the UI?
- [ ] Does success page handle the Stripe session correctly?
