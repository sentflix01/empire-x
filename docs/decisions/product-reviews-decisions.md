# Product Reviews Bugfix — Spec Decisions

**Spec location:** `.kiro/specs/product-reviews/`  
**Files:** `bugfix.md` · `design.md` · `tasks.md`  
**Type:** Bugfix spec

---

## Introduction

The Nodbusiness app has a complete reviews backend (`/api/reviews`) but the `ProductDetail`
frontend page never calls it, never holds review state, and never renders a reviews section.
Users see a completely blank reviews area even when the database contains reviews.

**Bug Condition (formal):**
```
isBugCondition(pageRender) =
  reviewsApiExists(pageRender.productId)          // backend route is live
  AND noApiCallMadeTo("/api/reviews/product/" + pageRender.productId)
  AND noReviewsUIRendered(pageRender.domOutput)
```

The fix is purely additive: a new `ReviewsSection.tsx` component is mounted in
`ProductDetail.tsx`. No existing code is deleted or modified.

---

## Bug Analysis Decisions

### Decision B.1 — What is the actual root cause?

**Question:** Is this a regression (something that used to work and broke), or a missing
feature (never built)?

**Options Considered:**
| Option | Description |
|--------|-------------|
| A — Regression: component was removed | Would require finding the deleted code |
| **B — Missing feature: component was never built** ✅ | Simplest explanation consistent with the codebase state |

**Decision Made:** Option B — missing feature.

**Rationale:** Searching the codebase finds no `ReviewsSection` file anywhere, no
`/api/reviews` call in `ProductDetail.tsx`, and no review-related state variables.
The backend was built but the frontend integration was never implemented.

**Impact:** The fix is entirely additive. No code is deleted or reverted.

---

### Decision B.2 — Should the fix touch the backend?

**Question:** The backend already has working endpoints. Should the fix include any backend changes?

**Options Considered:**
| Option | Description |
|--------|-------------|
| **A — Frontend only** ✅ | Backend is complete and correct; only the frontend needs to be built |
| B — Backend + frontend | Unnecessary; would increase risk of regression |

**Decision Made:** Option A — no backend changes.

**Rationale:** The backend has `GET /api/reviews/product/:productId`, `POST /api/reviews`,
and `DELETE /api/reviews/:id` — all the endpoints needed. Adding unnecessary backend
changes increases regression risk.

**Impact:** Tasks 3.1 and 3.2 are purely additive frontend changes.

---

## Component Design Decisions

### Decision C.1 — Where should the `StarRating` subcomponent live?

**Question:** Should `StarRating` be a separate exported component in its own file, or an
unexported internal component within `ReviewsSection.tsx`?

**Options Considered:**
| Option | Description |
|--------|-------------|
| A — Separate file `StarRating.tsx` | Reusable across the app |
| **B — Internal subcomponent in ReviewsSection.tsx** ✅ | Scoped to the reviews feature; easier to keep changes local |
| C — Inline JSX in ReviewsSection | No subcomponent at all; harder to read and test |

**Decision Made:** Option B — internal subcomponent, not exported.

**Rationale:** There are no other places in the current codebase that need an interactive
star rating. Exporting it prematurely increases the surface area of the public component API.
If needed later, it can be extracted.

**Impact:** `StarRating` is defined in `ReviewsSection.tsx` but not exported. Unit tests
for `StarRating` test it indirectly through `ReviewsSection`.

---

### Decision C.2 — How should the component know which review belongs to the current user?

**Question:** To show the "Edit your review" form pre-filled, the component needs to identify
the current user's review. Should this come from a dedicated API endpoint, or be derived
from the list returned by `GET /api/reviews/product/:productId`?

**Options Considered:**
| Option | Description |
|--------|-------------|
| A — Dedicated `GET /api/reviews/my-review/:productId` endpoint | Adds a new API call per page load |
| **B — Filter the existing list by `reviewer_id === currentUser.id`** ✅ | No extra API call; uses data already fetched |

**Decision Made:** Option B.

**Rationale:** The full list is already fetched on mount. Filtering client-side for
`myReview` is O(n) where n is the review count — negligible. A second API call would
double the network requests for authenticated users.

**Impact:** `loadReviews` sets `myReview` by calling
`.find(r => r.reviewer_id === currentUser?.id)` on the fetched array.

---

### Decision C.3 — Should the submit action (POST) use PATCH for updates or always POST?

**Question:** When editing an existing review, should the frontend call `PATCH /api/reviews/:id`
to update, or always `POST /api/reviews` (which uses an upsert pattern)?

**Options Considered:**
| Option | Description |
|--------|-------------|
| A — PATCH for updates, POST for creates | Semantically RESTful |
| **B — Always POST (upsert)** ✅ | Matches backend behavior: `ON CONFLICT DO UPDATE`; simpler frontend logic |

**Decision Made:** Option B.

**Rationale:** The backend `POST /api/reviews` uses `ON CONFLICT (product_id, reviewer_id)
DO UPDATE`, so submitting twice always updates the existing row. Using `PATCH` would require
tracking whether the user has an existing review before deciding which endpoint to call,
adding complexity for no functional benefit.

**Impact:** `handleSubmit` always calls `POST /api/reviews`. The form heading changes
between `"Leave a review"` and `"Edit your review"` based on `myReview` state, but the
API call is always the same.

---

### Decision C.4 — How should the average rating header be displayed?

**Question:** The product header already shows `product.average_rating` as a raw decimal
with a `Star` icon. Should `ReviewsSection` replace that display or add a richer one below?

**Options Considered:**
| Option | Description |
|--------|-------------|
| A — Replace the existing average_rating display in the header | Modifies existing code; regression risk |
| **B — Add richer display below the product card; leave header unchanged** ✅ | Additive; no regression risk |

**Decision Made:** Option B.

**Rationale:** The preservation requirements are explicit: `the product.average_rating
display in the metadata row must remain unchanged`. The new reviews section adds a richer
display (filled stars + "N reviews" label) *below* the product card, not in place of the
existing one.

**Impact:** `ProductDetail.tsx` changes are limited to one import and one JSX node appended
after the product card.

---

## State Management Decisions

### Decision S.1 — Should review state live in ProductDetail or ReviewsSection?

**Question:** Should the review list, form state, and submission state live in `ProductDetail.tsx`
(passed down as props) or be self-contained in `ReviewsSection.tsx`?

**Options Considered:**
| Option | Description |
|--------|-------------|
| A — In ProductDetail | Allows other parts of the page to react to review changes |
| **B — Self-contained in ReviewsSection** ✅ | Additive; does not touch ProductDetail's existing state |

**Decision Made:** Option B.

**Rationale:** The fix must be additive. If review state were placed in `ProductDetail`,
that would require modifying existing state declarations, creating a regression risk.
`ReviewsSection` is a completely self-contained slice.

**Impact:** `ProductDetail.tsx` needs no new `useState` calls. The only change is the import
and mount point.

---

### Decision S.2 — Which state variables does ReviewsSection need?

| Variable | Type | Initial | Purpose |
|----------|------|---------|---------|
| `reviews` | `Review[]` | `[]` | Full list from the API |
| `myReview` | `Review \| null` | `null` | Current user's existing review |
| `ratingInput` | `number` | `0` | Selected star value (form) |
| `commentInput` | `string` | `""` | Text area value (form) |
| `submitting` | `boolean` | `false` | Disables submit during POST |
| `deleting` | `boolean` | `false` | Disables delete during DELETE |

---

## Testing Decisions

### Decision T.1 — What test framework to use?

**Question:** The frontend has no test runner installed. Which testing framework to set up?

**Options Considered:**
| Option | Description |
|--------|-------------|
| A — Jest + React Testing Library | Most common; large ecosystem |
| **B — Vitest + React Testing Library** ✅ | Natively integrated with Vite; faster; compatible with the existing Vite config |
| C — Playwright (E2E only) | Too heavy for unit tests |

**Decision Made:** Vitest, because the project uses Vite and Vitest requires zero additional
configuration to work with the existing `vite.config.js`.

**Impact:** Task 0 installs `vitest`, `@vitest/coverage-v8`, `@testing-library/react`,
`@testing-library/jest-dom`, `@testing-library/user-event`, and `fast-check`.

---

### Decision T.2 — Should bug condition tests be written BEFORE or AFTER the fix?

**Question:** The exploratory bugfix methodology requires writing tests that prove the bug
exists. Should these tests be written before or after implementing the fix?

**Options Considered:**
| Option | Description |
|--------|-------------|
| **A — Write tests BEFORE the fix** ✅ | Tests will fail (proving the bug), then pass after the fix |
| B — Write tests after | Tests will always pass; no proof the fix was necessary |

**Decision Made:** Option A — tests must be written and executed against unfixed code first.

**Rationale:** The methodology requires a counterexample. If tests are written after the fix,
they cannot serve as evidence that the bug existed. Task 1 is explicitly marked "CRITICAL:
Write this test BEFORE creating ReviewsSection.tsx".

**Impact:** Task order is: Task 0 (infra) → Task 1 (bug condition test, expected FAIL) →
Task 2 (preservation test, expected PASS) → Task 3 (fix) → Task 3.3 (re-run Task 1,
expected PASS) → Task 3.4 (re-run Task 2, expected PASS).

---

### Decision T.3 — What should the preservation tests cover?

**Question:** Which existing behaviors need preservation tests?

**Behaviors covered by preservation tests:**

| Interaction | What is asserted |
|-------------|-----------------|
| Add to Cart click | `addToCart` called with `product.id` |
| Wishlist toggle (off→on) | `client.post('/api/wishlists', ...)` called |
| Wishlist toggle (on→off) | `client.delete('/api/wishlists/:id')` called |
| Image thumbnail click at index 1 | `selectedImage` updates to index 1 |
| Seller link | `to="/profile/:seller_id"` present |
| Product metadata | Title, price, description, stock, category all render |
| Random product shapes (PBT) | Card structure stable regardless of image count, stock, optional fields |

---

## Accessibility Decisions

### Decision A.1 — How should the interactive star rating be accessible?

**Options Considered:**
| Option | Description |
|--------|-------------|
| A — `<input type="range">` | Accessible but hard to style as stars |
| **B — `<button>` elements with `aria-label`** ✅ | Fully keyboard accessible; visual styling is straightforward |

**Decision Made:** Option B — five `<button>` elements each with an appropriate `aria-label`
(e.g., "Rate 3 out of 5 stars"). All colors use design-token Tailwind classes for dark-mode
compatibility.

---

## Color and Styling Decisions

All colors in `ReviewsSection.tsx` use design-token Tailwind classes:

| Use case | Class |
|----------|-------|
| Card background | `bg-card` |
| Card border | `border-border/50` |
| Secondary text | `text-muted-foreground` |
| Primary text | `text-foreground` |
| Input background | `bg-background` |
| Star fill (active) | `fill-amber-400 text-amber-400` |
| Star outline (inactive) | `text-muted-foreground` |
| Submit button | `bg-gradient-to-r from-amber-500 to-amber-600` |
| Delete button | `variant="ghost" className="text-destructive"` |

No raw hex values. Amber is used only for star/brand accent, consistent with the rest
of the application.

---

## Unchanged Behaviors (Regression Prevention Summary)

These behaviors were verified on unfixed code and must remain identical after the fix:

1. Add to Cart, Wishlist (heart), and Share buttons function exactly as before.
2. Image gallery and thumbnail strip render and behave identically with no layout shift.
3. Seller profile `Link` navigates to `/profile/:seller_id`.
4. `loadProduct()` fetches product data, wishlist status, and increments view count unchanged.
5. `product.average_rating` in the metadata row is unchanged.
6. Marketplace grid product cards are unaffected.
