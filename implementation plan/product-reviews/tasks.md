# Implementation Plan

## Overview

Implement the product reviews feature by following the exploratory bugfix workflow: first write tests against the unfixed code to prove the bug exists and capture preservation baselines, then build the fix (new `ReviewsSection.tsx` component + minimal `ProductDetail.tsx` mount point), then validate both the fix and preserved behaviour.

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": ["0"] },
    { "wave": 2, "tasks": ["1"] },
    { "wave": 3, "tasks": ["2"] },
    { "wave": 4, "tasks": ["3.1"] },
    { "wave": 5, "tasks": ["3.2"] },
    { "wave": 6, "tasks": ["3.3", "3.4"] },
    { "wave": 7, "tasks": ["4"] }
  ]
}
```

## Tasks

- [x] 0. Set up frontend test infrastructure
  - Install Vitest, jsdom, @testing-library/react, @testing-library/jest-dom, @testing-library/user-event, and fast-check as dev dependencies:
    `npm install -D vitest @vitest/coverage-v8 jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event fast-check`
  - Add the following to `vite.config.js` (or create `vitest.config.ts`) so Vitest uses jsdom:
    ```js
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
    }
    ```
  - Create `frontend-next/test/setup.ts` that imports `@testing-library/jest-dom/vitest`
  - Add `"test": "vitest --run"` and `"test:watch": "vitest"` scripts to `package.json`
  - Create mock files for `@/api/client` and `@/api/auth` under `frontend-next/__mocks__/` so unit tests can stub API calls without a live server
  - Verify: run `npm test` (single pass) — expect 0 test files found, exit 0
  - _Requirements: prerequisite for all test tasks_

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Reviews Section Absent Before Fix
  - **CRITICAL**: Write this test BEFORE creating `ReviewsSection.tsx` or modifying `ProductDetail.tsx`
  - **GOAL**: Surface counterexamples that prove the bug exists — the reviews API is never called and no reviews UI renders
  - **Scoped PBT Approach**: For each of these concrete product IDs ["42", "99", "7"], mock `GET /api/reviews/product/:id` to return a seeded array of reviews; generate varied review payloads with fast-check (`fc.array(reviewArb, { minLength: 1, maxLength: 5 })`); mount `ProductDetail` with that id and assert the API was called and review content appears in the DOM
  - Create `frontend-next/test/ProductDetail.bug-condition.test.tsx`
  - Mock `@/api/client` so `client.get('/api/reviews/product/42')` returns `[{ id:1, reviewer_id:'u1', display_name:'Alice', rating:4, comment:'Great', created_at: new Date().toISOString() }]`
  - Mock `@/api/auth` `auth.me()` to return `{ id: 'u99' }` (logged-in user who has not reviewed)
  - Assert: the text "Alice" appears in the rendered DOM (reviewer name)
  - Assert: `client.get` was called with a URL matching `/api/reviews/product/`
  - Assert: a star rating element is present (interactive form)
  - Also test unauthenticated case: mock `auth.me()` to throw/return null, assert "Sign in to leave a review" is in the DOM
  - Also test empty-state: mock reviews endpoint to return `[]`, assert "No reviews yet" text is in the DOM
  - Run test on **UNFIXED** code (before any file changes): `npm test -- --run`
  - **EXPECTED OUTCOME**: Test FAILS — `client.get` for reviews is never invoked, no review content in DOM; this confirms the bug exists
  - Document the exact counterexample (e.g., "Alice" not found, API call count = 0)
  - Mark task complete when test is written, executed, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Existing ProductDetail Interactions Unchanged
  - **IMPORTANT**: Follow observation-first methodology — run the original `ProductDetail` with the interactions below and record exact behaviour before touching any code
  - Observe on unfixed code:
    - `addToCart` is called with `product.id` when "Add to Cart" is clicked
    - `client.post('/api/wishlists', ...)` is called when heart button is clicked (unwishlisted state)
    - `client.delete('/api/wishlists/:id')` is called when heart button is clicked (wishlisted state)
    - Clicking thumbnail at index 2 (out of 3) causes the main image `src` to change to `images[2]`
    - Product title, price, description, category badge, and stock label all render with their data values
    - The seller `Link` renders with `to="/profile/:seller_id"`
  - Create `frontend-next/test/ProductDetail.preservation.test.tsx`
  - Use fast-check to generate random product shapes (varying image counts 0–5, random stock values 0/null/positive, optional description, optional location) and assert the product card DOM structure renders without error and retains title/price for each generated product
  - Write individual interaction tests:
    - Cart button click → `addToCart` mock called with correct `product.id`
    - Heart button click (wishlist off) → `client.post` called with `/api/wishlists`
    - Heart button click (wishlist on) → `client.delete` called with `/api/wishlists/:id`
    - Thumbnail click at index 1 → main image updates to `images[1]`
    - Seller link present with correct `href`/`to`
    - Product metadata fields render correct text content
  - Run tests on **UNFIXED** code: `npm test -- --run`
  - **EXPECTED OUTCOME**: All preservation tests PASS — confirms the baseline behaviour we must preserve
  - Mark task complete when tests are written, executed, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Implement the reviews feature

  - [x] 3.1 Create `frontend-next/components/product/ReviewsSection.tsx` (new file)
    - Define the `StarRating` sub-component (not exported) with props `{ value: number; onChange?: (n: number) => void; size?: "sm" | "md" }`:
      - Interactive mode (when `onChange` provided): 5 `<button>` elements each with a `Star` icon from `lucide-react`; stars at index ≤ `value` get `fill-amber-400 text-amber-400`, above get `text-muted-foreground`; maintain local `hover` state so hovering a star fills up to that index
      - Display-only mode (when `onChange` omitted): same fill logic, non-interactive `Star` icons
    - Define and default-export the `ReviewsSection` component with props `{ productId: string | number; currentUser: { id: string } | null }`:
      - State: `reviews: Review[]` (initial `[]`), `myReview: Review | null` (initial `null`), `ratingInput: number` (initial `0`), `commentInput: string` (initial `""`), `submitting: boolean` (initial `false`), `deleting: boolean` (initial `false`)
      - `loadReviews`: `GET /api/reviews/product/{productId}` via `client` from `@/api/client`; set `reviews`; find `myReview` where `r.reviewer_id === currentUser?.id`; if found, pre-fill `ratingInput` and `commentInput`
      - Call `loadReviews` once on mount via `useEffect([productId])`
      - `handleSubmit`: validate `ratingInput >= 1` (show inline `<p className="text-xs text-destructive">` if not); `POST /api/reviews` with `{ product_id: productId, rating: ratingInput, comment: commentInput }`; re-call `loadReviews`; `toast.success`
      - `handleDelete(reviewId)`: `DELETE /api/reviews/{reviewId}`; re-call `loadReviews`; reset `ratingInput` to `0` and `commentInput` to `""`; `toast.success("Review deleted")`
      - Review list: map `reviews` to cards — `bg-card border border-border/50 rounded-xl p-4` with avatar (first letter), `display_name`, `<StarRating value={r.rating} size="sm" />`, `new Date(r.created_at).toLocaleDateString()`, and `comment`
      - Loading/empty state: spinner while fetching; `"No reviews yet. Be the first!"` paragraph with `text-muted-foreground` when list is empty and loaded
      - Submission form (only when `currentUser` is not null): heading `"Edit your review"` / `"Leave a review"`, `<StarRating value={ratingInput} onChange={setRatingInput} />`, `<textarea>` with classes `w-full rounded-xl border border-border/50 bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/40 resize-none`, submit `<Button>` with `bg-gradient-to-r from-amber-500 to-amber-600`, delete `<Button variant="ghost" className="text-destructive">` (only when `myReview` exists)
      - Unauthenticated state: `<p className="text-sm text-muted-foreground">` with `<Link to="/login">Sign in to leave a review</Link>`
      - All colours use design tokens (`bg-card`, `border-border/50`, `text-muted-foreground`, `text-foreground`, `bg-background`, `amber-400`/`amber-500` for star/brand accent) — no raw hex values
    - _Bug_Condition: `isBugCondition(pageRender)` — page is rendered, `/api/reviews` surface exists, no reviews call made, no reviews UI rendered_
    - _Expected_Behavior: after fix, `GET /api/reviews/product/:productId` is called on mount; `ReviewsSection` renders review list (or empty-state), submission form for authenticated users, sign-in prompt for unauthenticated users_
    - _Preservation: `ReviewsSection` is a new additive component; it must not import or mutate any state owned by `ProductDetail`_
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [x] 3.2 Modify `frontend-next/pages/ProductDetail.tsx` (minimal, additive only)
    - Add one import at the top of the file:
      ```tsx
      import ReviewsSection from "@/components/product/ReviewsSection";
      ```
    - Append `<ReviewsSection productId={id} currentUser={user} />` immediately after the closing `</div>` of the `bg-card rounded-2xl` product card div, before the closing `</div>` of the page root
    - Do NOT remove, reorder, or modify any existing code — this change is purely additive
    - The `user` state variable already exists (`const [user, setUser] = useState(null)`) and is populated via `auth.me()` inside `loadProduct()` — no additional state needed
    - _Requirements: 2.1, 2.5_

  - [x] 3.3 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Reviews Section Renders With Data
    - **IMPORTANT**: Re-run the SAME test file from task 1 — do NOT write a new test
    - The test from task 1 encodes the expected behavior: API called, review content in DOM, form or prompt present
    - Run: `npm test -- --run ProductDetail.bug-condition`
    - **EXPECTED OUTCOME**: Test PASSES — confirms the bug is fixed; `client.get` for reviews is now called, review content appears, form/prompt renders correctly
    - If any assertion fails, diagnose whether the issue is in `ReviewsSection.tsx` or the `ProductDetail.tsx` mount point
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [x] 3.4 Verify preservation tests still pass
    - **Property 2: Preservation** - Existing ProductDetail Interactions Unchanged
    - **IMPORTANT**: Re-run the SAME test file from task 2 — do NOT write new tests
    - Run: `npm test -- --run ProductDetail.preservation`
    - **EXPECTED OUTCOME**: All preservation tests PASS — confirms no regressions in cart, wishlist, image gallery, seller link, or product metadata
    - If any preservation test fails, the fix introduced an unintended side effect — review task 3.2 to ensure no existing code was modified
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 4. Checkpoint — Ensure all tests pass
  - Run the full test suite: `npm test -- --run`
  - All tests must pass: test infrastructure setup (task 0), bug condition exploration (task 1 / 3.3), preservation property tests (task 2 / 3.4)
  - Optionally run `npm run lint` and `npm run typecheck` to catch any import or type errors introduced by the new component
  - If any test fails, return to the relevant task to diagnose before marking this checkpoint complete
  - Ask the user if any questions arise about expected test outcomes or edge cases

## Notes

- The frontend has no test runner installed yet; task 0 sets up Vitest + React Testing Library + fast-check before any test tasks run.
- Tasks 1 and 2 MUST be written and executed on **unfixed** code. Task 1 is expected to FAIL (proves the bug). Task 2 is expected to PASS (establishes preservation baseline).
- Tasks 3.1 and 3.2 are purely additive — no existing code in `ProductDetail.tsx` is modified or deleted.
- The `user` state variable already exists in `ProductDetail.tsx`; no additional state plumbing is needed.
- All API calls inside `ReviewsSection` use `client` from `@/api/client` (the same Axios instance used throughout the app) and `toast` from `sonner` (already a project dependency).
- Colours must use design-token Tailwind classes only (`bg-card`, `border-border/50`, `text-muted-foreground`, etc.) to ensure correct dark-mode behaviour without any extra configuration.
