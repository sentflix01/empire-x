# Product Reviews Bugfix Design

## Overview

`ProductDetail.tsx` makes no API call to `/api/reviews` and renders no reviews UI, so users see a
completely blank reviews area even when the database is populated. The fix adds a self-contained
`ReviewsSection` component that is appended below the existing product card in `ProductDetail.tsx`.
No changes are made to the backend; no existing UI is modified. The approach is purely additive.

---

## Glossary

- **Bug_Condition (C)**: The product detail page is rendered AND the reviews API surface exists AND
  the page makes no call to `/api/reviews/product/:productId`, causing a blank reviews section.
- **Property (P)**: After the fix, visiting a product detail page SHALL display the `ReviewsSection`
  component, which fetches and renders all existing reviews and (for authenticated users) a submission
  form.
- **Preservation**: All existing behaviour in `ProductDetail.tsx` — image gallery, cart, wishlist,
  share, seller link, product metadata — must remain functionally identical.
- **ReviewsSection**: The new component at `frontend-next/components/product/ReviewsSection.tsx`
  responsible for the complete reviews feature slice.
- **StarRating**: A subcomponent within `ReviewsSection.tsx` that renders five stars in either
  interactive (click to rate) or display-only (read-only fill) mode.
- **myReview**: The review object returned by the API whose `reviewer_id` matches the currently
  authenticated user, used to pre-fill the edit form.
- **upsert**: The backend `POST /api/reviews` uses `ON CONFLICT (product_id, reviewer_id) DO UPDATE`,
  so submitting twice updates the existing row rather than inserting a duplicate.

---

## Bug Details

### Bug Condition

The bug manifests when any user visits `/products/:id`. `ProductDetail.tsx` never calls
`/api/reviews/product/:productId`, never holds any review state, and never renders a reviews section.
The component has no `ReviewsSection` import or mount point.

**Formal Specification:**

```
FUNCTION isBugCondition(pageRender)
  INPUT: pageRender — a render of the ProductDetail route for a given productId
  OUTPUT: boolean

  RETURN reviewsApiExists(pageRender.productId)          -- backend route is live
         AND noApiCallMadeTo("/api/reviews/product/" + pageRender.productId)
         AND noReviewsUIRendered(pageRender.domOutput)
END FUNCTION
```

### Examples

- A product with 8 reviews in the DB: user visits the page → review list is blank, count shows 0.
- An authenticated user who previously left a 4-star review: no pre-filled form, no indication of
  their existing review.
- A product with `average_rating = 4.5` stored: the header shows the raw decimal but no star
  visualisation and no "N reviews" label.
- An unauthenticated visitor: no reviews list and no "sign in to review" prompt.

---

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**

- Add to Cart, Wishlist (heart), and Share buttons must continue to function exactly as before.
- The image gallery and thumbnail strip must render and behave identically with no layout shift.
- The seller profile `Link` must continue navigating to `/profile/:seller_id`.
- `loadProduct()` must continue fetching product data, wishlist status, and incrementing view count
  via the same code paths.
- The `product.average_rating` display in the metadata row (the raw decimal next to the `Star` icon)
  must remain unchanged — `ReviewsSection` adds a richer display *below* the card, not in place of
  the existing one.
- Marketplace grid product cards must be unaffected — they already read `product.average_rating`
  from the product record.

**Scope:**

All inputs that do NOT involve the reviews section (button clicks, image navigation, wishlist
toggling, cart actions, seller navigation) must be completely unaffected by this change.

---

## Hypothesized Root Cause

The root cause is a missing feature, not a regression: `ReviewsSection` was never built.

1. **No API integration**: `ProductDetail.tsx` has no `useEffect` or data-fetch call targeting
   `/api/reviews/product/:productId`.
2. **No component**: There is no `ReviewsSection` component file in the codebase.
3. **No mount point**: `ProductDetail.tsx` has no JSX node below the product card where reviews
   would be rendered.
4. **No state slots**: The component holds no state for `reviews`, `myReview`, `ratingInput`,
   `commentInput`, or `submitting`.

---

## Correctness Properties

Property 1: Bug Condition — Reviews Section Renders With Data

_For any_ render of `ProductDetail` where `isBugCondition` holds (the page is visited, the API
exists, but no reviews UI is present), the fixed implementation SHALL call
`GET /api/reviews/product/:productId`, store the result, and render a `ReviewsSection` component
that displays the fetched reviews list (or an empty-state message when the list is empty) and the
appropriate form state based on authentication.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7**

Property 2: Preservation — Existing ProductDetail Behaviour Is Unchanged

_For any_ user interaction that does NOT involve the reviews section (cart, wishlist, share,
image gallery, seller link, product metadata display), the fixed `ProductDetail.tsx` SHALL produce
exactly the same behaviour as the original, preserving all existing data flows, handlers, and
rendered output outside the `ReviewsSection` mount point.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

---

## Fix Implementation

### Changes Required

#### File 1: `frontend-next/components/product/ReviewsSection.tsx` *(new file)*

**Component: `ReviewsSection`**

Props: `{ productId: string | number; currentUser: { id: string } | null }`

**Internal state:**

| State variable  | Type                        | Initial value | Purpose                                    |
|-----------------|-----------------------------|---------------|--------------------------------------------|
| `reviews`       | `Review[]`                  | `[]`          | Full list from GET endpoint                |
| `myReview`      | `Review \| null`            | `null`        | The current user's existing review if any  |
| `ratingInput`   | `number`                    | `0`           | Star value selected in the form (1–5)      |
| `commentInput`  | `string`                    | `""`          | Text field value                           |
| `submitting`    | `boolean`                   | `false`       | Disables submit button during POST         |
| `deleting`      | `boolean`                   | `false`       | Disables delete button during DELETE       |

**Fetch logic (`loadReviews`):**

```
FUNCTION loadReviews(productId)
  response ← GET /api/reviews/product/{productId}   -- uses client from @/api/client
  setReviews(response.data)
  mine ← response.data.find(r => r.reviewer_id === currentUser?.id)
  setMyReview(mine ?? null)
  IF mine THEN
    setRatingInput(mine.rating)
    setCommentInput(mine.comment ?? "")
  END IF
END FUNCTION
```

Called once on mount via `useEffect([productId])`.

**Submit logic (`handleSubmit`):**

```
FUNCTION handleSubmit()
  IF ratingInput < 1 THEN show validation message; RETURN END IF
  setSubmitting(true)
  POST /api/reviews  { product_id: productId, rating: ratingInput, comment: commentInput }
  await loadReviews(productId)
  toast.success(myReview ? "Review updated" : "Review submitted")
  setSubmitting(false)
END FUNCTION
```

**Delete logic (`handleDelete`):**

```
FUNCTION handleDelete(reviewId)
  setDeleting(true)
  DELETE /api/reviews/{reviewId}
  await loadReviews(productId)
  setRatingInput(0)
  setCommentInput("")
  toast.success("Review deleted")
  setDeleting(false)
END FUNCTION
```

**Specific implementation changes:**

1. **`StarRating` sub-component** (defined in the same file, not exported):
   - Props: `{ value: number; onChange?: (n: number) => void; size?: "sm" | "md" }`
   - When `onChange` is provided → interactive mode: renders 5 `<button>` elements, each
     containing a `Star` icon from `lucide-react`; filled amber (`fill-amber-400 text-amber-400`)
     for indices ≤ `value`, outline (`text-muted-foreground`) above.
   - When `onChange` is omitted → display-only mode: renders 5 non-interactive `Star` icons with
     the same fill logic; used for each review card.
   - Hover state in interactive mode: temporarily fills stars up to the hovered index using local
     `hover` state.

2. **Review list rendering**: Maps over `reviews` array. Each card uses `bg-card border
   border-border/50 rounded-xl p-4` with reviewer avatar (first letter fallback like the seller
   card), `display_name`, `<StarRating value={r.rating} size="sm" />`, date formatted with
   `new Date(r.created_at).toLocaleDateString()`, and `comment` text.

3. **Submission form**:
   - Shown only when `currentUser` is not null.
   - Heading: `"Edit your review"` when `myReview` exists; `"Leave a review"` otherwise.
   - `<StarRating value={ratingInput} onChange={setRatingInput} />` (interactive).
   - `<textarea>` bound to `commentInput` — Tailwind classes matching existing textarea patterns:
     `w-full rounded-xl border border-border/50 bg-background px-3 py-2 text-sm
      placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/40
      resize-none`.
   - Submit `<Button>` with `bg-gradient-to-r from-amber-500 to-amber-600` (matches CTA style).
   - Delete button (shown only when `myReview` exists): `variant="ghost"` with `text-destructive`.
   - Inline validation: if `ratingInput === 0` on submit, render a `<p className="text-xs
     text-destructive">` message.

4. **Unauthenticated state**: When `currentUser` is null, render a `<p>` with
   `text-sm text-muted-foreground` containing a `<Link to="/login">` prompt:
   `"Sign in to leave a review"`.

5. **Empty reviews list**: When `reviews.length === 0` and still loading, show the same spinner
   already used in `ProductDetail`. When loaded and empty, render a centred
   `"No reviews yet. Be the first!"` paragraph with `text-muted-foreground`.

6. **Dark mode**: All colours use design-token classes (`bg-card`, `border-border/50`,
   `text-muted-foreground`, `text-foreground`, `bg-background`) that already resolve correctly in
   both light and dark themes. No raw hex values. `amber-400` / `amber-500` are used only for
   brand/star accent, consistent with the rest of the app.

---

#### File 2: `frontend-next/pages/ProductDetail.tsx` *(modification)*

**Specific changes (minimal, additive only):**

1. Add import at top of file:
   ```tsx
   import ReviewsSection from "@/components/product/ReviewsSection";
   ```

2. Append `<ReviewsSection>` after the closing `</div>` of the product card and before the
   closing `</div>` of the page root:
   ```tsx
   <ReviewsSection productId={id} currentUser={user} />
   ```

   The `user` state already exists (`const [user, setUser] = useState(null)`) and is populated
   inside `loadProduct()` via `auth.me()`. No additional state is needed in `ProductDetail`.

No existing code in `ProductDetail.tsx` is removed or modified.

---

## Testing Strategy

### Validation Approach

Testing follows two phases: first run exploratory tests against the **unfixed** code to surface the
bug concretely and confirm the root cause; then run fix-checking and preservation tests against the
**fixed** code.

---

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm the
root cause (missing component + missing API call). If tests reveal a different cause, re-hypothesize.

**Test Plan**: Mount `ProductDetail` with a mocked `client` that serves a known reviews payload for
a given `productId`. Assert that the DOM contains review data. Run on unfixed code — these tests
will fail because `ReviewsSection` does not exist and `client.get('/api/reviews/...')` is never
called.

**Test Cases:**

1. **Reviews list absent (unfixed)**: Mock `GET /api/reviews/product/42` to return 3 reviews.
   Mount `ProductDetail` with `id = "42"`. Assert the DOM contains the first reviewer's
   `display_name`. *Will fail on unfixed code — the call is never made.*

2. **Form absent for authenticated user (unfixed)**: Mock auth to return a logged-in user. Assert
   a star-rating control or textarea is present in the DOM. *Will fail — no form is rendered.*

3. **Sign-in prompt absent for unauthenticated user (unfixed)**: Mock auth to return null. Assert
   a "Sign in to leave a review" element exists. *Will fail — no prompt is rendered.*

4. **Empty-state absent (unfixed)**: Mock `GET /api/reviews/product/42` to return `[]`. Assert
   an empty-state message is rendered. *Will fail — nothing is rendered.*

**Expected Counterexamples:**

- No element matching review content is found in the DOM.
- The mocked `client.get` for the reviews endpoint is never called.
- Root cause confirmed: missing component and missing data-fetch.

---

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed implementation
produces the expected behaviour.

**Pseudocode:**

```
FOR ALL productId WHERE isBugCondition(render(productId)) DO
  mountedPage := render ProductDetail with productId, mocked reviews API, mocked auth
  ASSERT reviewsApiCalled("/api/reviews/product/" + productId)
  ASSERT reviewListVisible(mountedPage.dom)
  IF currentUser != null THEN
    ASSERT submissionFormVisible(mountedPage.dom)
  ELSE
    ASSERT signInPromptVisible(mountedPage.dom)
  END IF
END FOR
```

**Test Cases:**

1. **Reviews list rendered**: Mock 3 reviews → assert all three `display_name` values appear.
2. **Average rating header**: Assert star icons with amber fill are present when
   `product.average_rating > 0`.
3. **Authenticated user — new review form**: Mock `currentUser` with an id not in the reviews list
   → assert heading "Leave a review" and interactive star buttons are present.
4. **Authenticated user — edit form**: Mock `currentUser` with an id matching a review in the list
   → assert heading "Edit your review" and pre-filled `ratingInput`.
5. **Unauthenticated — sign-in prompt**: Mock `currentUser = null` → assert "Sign in" link.
6. **Validation — missing rating**: Submit form with `ratingInput = 0` → assert validation message
   appears and `POST /api/reviews` is NOT called.
7. **Successful submit**: Fill `ratingInput = 4`, call submit → assert `POST /api/reviews` called
   with correct body, success toast shown, review list refreshed.
8. **Delete review**: Click delete on `myReview` → assert `DELETE /api/reviews/:id` called, form
   resets, review removed from list.

---

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold (non-reviews
interactions), the fixed `ProductDetail` produces the same behaviour as the original.

**Pseudocode:**

```
FOR ALL interaction WHERE NOT involvesReviewsSection(interaction) DO
  ASSERT behaviour(ProductDetail_original, interaction)
       = behaviour(ProductDetail_fixed, interaction)
END FOR
```

**Testing Approach**: Property-based testing is suitable for preservation checking because button
click handlers and fetch calls are deterministic given the same mocked API responses — generating
varied product shapes (random images count, random stock values, various seller configurations)
catches edge cases that hand-written examples miss.

**Test Cases:**

1. **Cart button preservation**: Click "Add to Cart" → assert `addToCart` called with `product.id`;
   no reviews-related state is touched.
2. **Wishlist toggle preservation**: Click heart button → assert `client.delete` or `client.post`
   to `/api/wishlists` is called; toast fires; `wishlisted` state flips.
3. **Image gallery preservation**: Render product with 3 images → click thumbnail at index 2 →
   assert `selectedImage` updates to 2; main image `src` changes.
4. **Seller link preservation**: Assert `Link` to `/profile/:seller_id` is present and navigates
   correctly.
5. **Product metadata preservation**: Assert title, price, description, stock label, location, and
   category badge render with unchanged text content.
6. **No layout shift (property-based)**: Generate random products (0–5 images, with/without
   description, with/without location) → assert the product card DOM structure is identical between
   original and fixed renders above the `ReviewsSection` mount point.

---

### Unit Tests

- `StarRating` renders correct number of filled stars for values 0–5 (display mode).
- `StarRating` fires `onChange` with correct value on click (interactive mode).
- `StarRating` reflects hover state visually before click is committed.
- `ReviewsSection` shows spinner during fetch, then transitions to list or empty state.
- `handleSubmit` is a no-op (with validation error) when `ratingInput === 0`.
- `handleDelete` calls `DELETE /api/reviews/:id` and resets form state.

### Property-Based Tests

- For any `reviews` array of length 0–50 with valid `Review` shapes, `ReviewsSection` renders
  exactly `reviews.length` review cards (or the empty-state when length is 0).
- For any `rating` value in `[1, 2, 3, 4, 5]`, `StarRating` renders exactly `rating` filled stars
  and `5 - rating` outline stars in display mode.
- For any product shape where `average_rating` is in `[0, 5]`, the page renders without throwing
  and the product card layout matches the original structure.
- For any non-reviews interaction event (cart click, wishlist click, image thumbnail click), the
  `ReviewsSection` state variables (`reviews`, `ratingInput`, `commentInput`) remain unchanged.

### Integration Tests

- Full page render with real MSW (or equivalent) mocking `/api/products/:id`,
  `/api/reviews/product/:id`, `/api/wishlists/check/:id`, and `auth.me()` — verify complete happy
  path: page loads, reviews display, form submits, list refreshes.
- Switch between unauthenticated and authenticated states on the same product page — verify correct
  UI transitions (sign-in prompt ↔ submission form).
- Submit a review, then reload — verify the edit form appears pre-filled with the previously
  submitted values.
- Delete a review — verify the form resets to "Leave a review" heading and empty star selection.
