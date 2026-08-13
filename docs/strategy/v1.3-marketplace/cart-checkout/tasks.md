# Cart & Checkout — Tasks

## Status: 🔴 Not Started

---

## Step 1 — Cart Nav Badge

- [ ] Cart item count visible in bottom nav / header at all times
- [ ] Zustand `cartSlice` stores count, updates on add/remove
- [ ] Badge shows count (hide when 0, show red dot when > 0)
- [ ] Count syncs from server on app load: `GET /api/cart` → `data.count`

---

## Step 2 — Cart Page

- [ ] Quantity control: − button (disabled at 1) / count display / + button (disabled at stock)
- [ ] Quantity change: optimistic update → `PUT /api/cart/:id { quantity }`
- [ ] Remove item: immediate removal from list → `DELETE /api/cart/:id`
- [ ] Group items by seller (seller name as section heading)
- [ ] Subtotal per seller group
- [ ] Grand total at bottom (sum of all seller subtotals)
- [ ] Coupon field: input + "Apply" button
  - On apply → `POST /api/coupons/validate { code, seller_id }`
  - Show discount line: "Coupon BOLE20: −ETB 200"
  - Show error if invalid/expired
  - "Remove" link to clear coupon
- [ ] Empty cart → `<EmptyState>` with "Shop now" CTA

---

## Step 3 — Delivery Details Step

- [ ] Full name pre-filled from user profile
- [ ] Phone number pre-filled from profile (if exists)
- [ ] Delivery address: text area or structured (street, district, city)
- [ ] Special notes: optional textarea
- [ ] "Continue to Payment" button
- [ ] Form validates before proceeding

---

## Step 4 — Payment Step

- [ ] Show order summary (items, subtotal, discount, total)
- [ ] "Pay with Card / Wallet" button → calls `POST /api/orders/checkout/session`
  - Show loading spinner on button while waiting for Stripe URL
  - Redirect to Stripe Hosted Checkout
- [ ] "Pay with Telebirr / CBE" button (shown when `FF_CHAPA_PAYMENTS` is on)
  - Calls `POST /api/orders/checkout/chapa`
  - Redirects to Chapa payment page
- [ ] Payment buttons disabled when form invalid

---

## Step 5 — Success Page

- [ ] `/orders/success` page:
  - Large green checkmark animation (Framer Motion)
  - "Order Confirmed!" heading
  - Order details: items, total, order ID
  - "Track your order" → `/orders/[id]`
  - "Continue shopping" → `/marketplace`
- [ ] Fetch order by `session_id` from URL: `GET /api/orders/session/:sessionId`
- [ ] Handle case where webhook hasn't fired yet (poll for 5s max, show "processing")

---

## Step 6 — Cancel Page

- [ ] `/orders/cancel` page: friendly "Payment cancelled" message
- [ ] "Return to cart" button (cart items should still be there)
- [ ] Do NOT clear cart on cancel — Stripe sessions expire, items should remain

---

## Step 7 — Verify

- [ ] Add to cart → badge updates instantly
- [ ] Change quantity → total updates instantly
- [ ] Apply coupon → discount appears immediately
- [ ] Complete Stripe checkout → success page shows correct order
- [ ] Cancel Stripe checkout → cart still has items
- [ ] Order appears in `/orders` page after payment
