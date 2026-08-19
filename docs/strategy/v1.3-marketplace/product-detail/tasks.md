# Product Detail Page — Tasks

## Status: 🔴 Not Started

---

## Step 1 — Image Gallery

- [ ] Create `frontend-next/components/marketplace/ImageGallery.tsx`
  - Props: `images: string[]`
  - Main image: large, `object-cover`, click to open lightbox
  - Thumbnail row below: horizontal scroll, clicking sets main image
  - Touch/swipe support on mobile (use CSS `scroll-snap` or `embla-carousel`)
  - Image counter: "1 / 4" overlay bottom-right
  - Fallback: placeholder image when `images` is empty

---

## Step 2 — Variant Selector

- [ ] Create `frontend-next/components/marketplace/VariantSelector.tsx`
  - Fetch variants: `GET /api/variants?product_id=xxx`
  - Group by `name` (e.g. "Size", "Color")
  - Render each group as chips: S / M / L / XL
  - Selected chip: filled background (primary color)
  - Out-of-stock variant: strikethrough + disabled
  - Selected variant ID stored in local state
- [ ] "Add to Cart" disabled until required variant selected (if product has variants)

---

## Step 3 — Action Buttons

- [ ] "Add to Cart" button
  - Calls `POST /api/cart { product_id, quantity, variant_id? }`
  - Optimistic: button changes to "Added ✓" for 2s then back
  - Cart badge in nav increments immediately
- [ ] "Buy Now" button
  - Adds to cart + navigates to `/cart` immediately
- [ ] Wishlist heart icon (top-right of main image)
  - Optimistic toggle
- [ ] "Message Seller" button
  - `POST /api/messages/conversations` to create/find DM
  - Navigate to `/messages/[conversationId]`

---

## Step 4 — Stock Status Indicator

- [ ] `stock > 10` → "In stock" (green)
- [ ] `stock <= 10 && stock > 0` → "Only {stock} left!" (orange/amber)
- [ ] `stock === 0 || status === 'sold_out'` → "Sold out" (red), Add to Cart disabled

---

## Step 5 — Reviews Section

- [ ] Rating breakdown: 5★ bar (width = % of total), 4★ bar, etc.
- [ ] Average rating large display: "4.2 ★ (38 reviews)"
- [ ] Individual reviews: avatar, name, rating, date, comment
- [ ] Load 5 reviews initially, "Load more" button
- [ ] "Write a review" button — only shown if user has a completed order for this product
  - Opens modal: star rating (required) + comment (optional) + submit

---

## Step 6 — Related Products

- [ ] Horizontal scroll row: "More from this seller" or "Similar products"
- [ ] 4–6 product cards in scroll row
- [ ] Backend: `GET /api/products?seller_id=xxx&limit=6` or `?category=xxx&limit=6`

---

## Step 7 — SEO Meta Tags

- [ ] `generateMetadata` in Next.js page file:
  ```ts
  export async function generateMetadata({ params }) {
    const product = await fetchProduct(params.id);
    return {
      title: `${product.title} — Nodbusiness`,
      description: product.description?.slice(0, 155),
      openGraph: {
        title: product.title,
        images: [product.images?.[0]],
      },
    };
  }
  ```

---

## Step 8 — Verify

- [ ] Gallery swipes on mobile touch
- [ ] Variant must be selected before Add to Cart works
- [ ] Stock badge shows correct state
- [ ] "Message Seller" opens correct DM
- [ ] Review submission works for users with completed orders
- [ ] Related products row scrolls horizontally
- [ ] OG image appears correctly when URL shared on WhatsApp
