# Product Listing Page — Audit

## Current State

- Route: `/marketplace`
- Backend: `GET /api/products?limit=20&category=&sort=`
- Frontend: product cards in a grid

## Product Card Requirements (Global Standard)

| Element | Required | Notes |
|---------|----------|-------|
| Product image | ✅ | First image from `images` JSON array |
| Title | ✅ | 1 line truncated |
| Price | ✅ | Bold, ETB formatted |
| Rating | ✅ | Star display + count "(24)" |
| Seller name | ✅ | Small, links to seller profile |
| Category badge | Optional | Subtle chip |
| Wishlist heart | ✅ | Top-right corner, optimistic toggle |
| "Sold out" overlay | ✅ | When `stock === 0` or `status === 'sold_out'` |
| Location | Optional | District name, small |
| Condition badge | Optional | "New" / "Used" |

## Filter & Sort Requirements

**Filters (left sidebar on desktop, bottom sheet on mobile):**
- Category (chips or dropdown)
- Price range (dual slider: min–max ETB)
- Location/district (dropdown)
- Rating (4★ & up, 3★ & up)
- Condition (New, Used)
- Availability (In stock only toggle)

**Sort options (dropdown top-right):**
- Newest first (default)
- Price: Low to High
- Price: High to Low
- Most Popular (by view_count)
- Highest Rated (by average_rating)

## Layout

- Desktop: 3–4 column grid with left filter sidebar
- Tablet: 2 column grid, filter as collapsible panel
- Mobile: 2 column grid, filter as bottom sheet triggered by filter button
