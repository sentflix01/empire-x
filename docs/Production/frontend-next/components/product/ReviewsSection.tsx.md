# frontend-next/components/product/ReviewsSection.tsx

## 1. What is this?

**Screen component (view layer).** Module of the frontend application.

Size: roughly 264 lines of source.

## 2. Why does it exist?

Module of the frontend application.

## 3. What does it do?

Implements the behavior described above as an interactive client-side module:
data flows through `api/client.ts` (silent token refresh), errors surface via
sonner toasts, and auth failures are handled globally by interceptors.

## 4. What does it touch?

**API endpoints:**
- `/api/client`
- `/api/reviews/product/${productId}`
- `/api/reviews`
- `/api/reviews/${myReview.id}`

**Source file:** `frontend-next/components/product/ReviewsSection.tsx`
