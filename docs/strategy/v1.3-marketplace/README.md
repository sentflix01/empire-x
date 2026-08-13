# v1.3 — Marketplace

> **Theme:** Commerce
> **Goal:** Buying and selling on Halehame feels as smooth and trustworthy as any global e-commerce platform. Every step of the commerce flow — browse, detail, cart, checkout, order tracking — is polished and professional.

---

## Scope

| Section | File |
|---------|------|
| Product listing page | [audit.md](./product-listing/audit.md) · [tasks.md](./product-listing/tasks.md) |
| Product detail page | [audit.md](./product-detail/audit.md) · [tasks.md](./product-detail/tasks.md) |
| Search & filters | [audit.md](./search-filters/audit.md) · [tasks.md](./search-filters/tasks.md) |
| Cart & checkout | [audit.md](./cart-checkout/audit.md) · [tasks.md](./cart-checkout/tasks.md) |
| Order management | [audit.md](./order-management/audit.md) · [tasks.md](./order-management/tasks.md) |
| Seller dashboard | [audit.md](./seller-dashboard/audit.md) · [tasks.md](./seller-dashboard/tasks.md) |
| Reviews & ratings | [audit.md](./reviews-ratings/audit.md) · [tasks.md](./reviews-ratings/tasks.md) |
| Wishlists & price alerts | [audit.md](./wishlists-alerts/audit.md) · [tasks.md](./wishlists-alerts/tasks.md) |
| Returns & refunds | [audit.md](./returns-refunds/audit.md) · [tasks.md](./returns-refunds/tasks.md) |

---

## Success Criteria

- [ ] Product cards show: image, title, price, rating, seller name
- [ ] Filter by: category, price range, location, rating, condition
- [ ] Sort by: newest, price low-high, price high-low, most popular
- [ ] Product detail: image gallery (swipe), description, variants, reviews, seller info
- [ ] Add to cart is instant (optimistic), cart count updates in nav
- [ ] Checkout flow: cart review → delivery address → payment → confirmation
- [ ] Stripe checkout redirects correctly and order status updates via webhook
- [ ] Order tracking shows delivery timeline with status updates
- [ ] Seller can update order status: processing → shipped → delivered
- [ ] Buyer can leave review only after order is completed
- [ ] Wishlist heart icon on all product cards — persists across sessions
- [ ] Price alert fires notification when product drops below target price

---

## Dependencies

- Backend: products, orders, reviews, cart, wishlists, returns, delivery routes (all exist)
- Backend: Stripe webhook (exists), Chapa (feature-flagged)
- Frontend: image gallery component, variant selector, delivery timeline component
