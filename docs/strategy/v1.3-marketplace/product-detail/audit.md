# Product Detail Page — Audit

## Route
`/products/[id]`

## Required Elements (Global Standard)

| Section | Elements |
|---------|----------|
| Image gallery | Swipeable thumbnails, main image zoom on tap, image count indicator |
| Title & price | H1 title, bold ETB price, "was / now" if discounted |
| Rating & reviews | Star display, count, "Write a review" anchor |
| Seller info | Avatar, name, rating, "View shop" link, "Message seller" button |
| Stock status | "In stock (12 left)" / "Only 3 left!" / "Sold out" |
| Variants | Size/color chips — required before Add to Cart |
| Quantity selector | − / count / + (max = stock) |
| Action buttons | "Add to Cart" (primary) + "Buy Now" (secondary) + Wishlist heart |
| Description | Full text, expandable if > 300 chars |
| Delivery info | Estimated delivery, delivery area |
| Reviews section | Rating breakdown (5★ / 4★ / etc.), individual reviews |
| Related products | Horizontal scroll row of similar items |
| Share button | Copy link, WhatsApp, Telegram |

## Issues to Investigate

- [ ] Does image gallery support swipe on mobile?
- [ ] Are variants (size/color) selectable before Add to Cart?
- [ ] Is "Add to Cart" disabled when stock = 0?
- [ ] Does "Message seller" open a DM conversation?
- [ ] Are reviews paginated or all loaded at once?
- [ ] Is there a related products section?
- [ ] Does the page have proper SEO meta tags (title, description, OG image)?
