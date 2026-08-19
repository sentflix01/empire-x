# Error States — Tasks

## Status: 🔴 Not Started

---

## Step 1 — Build Error UI Components

- [ ] Create `frontend-next/components/ui/ErrorMessage.tsx`
  - Props: `title`, `description`, `onRetry?: () => void`, `className?`
  - Shows: icon + title + description + optional retry button
  - Variants: `inline` (within a page section) and `page` (full page centered)

- [ ] Create `frontend-next/components/ui/OfflineBanner.tsx`
  - Sticky top banner: "You're offline. Reconnect to use all features."
  - Uses `navigator.onLine` + `window` online/offline events
  - Auto-dismisses on reconnect with "Back online ✓" confirmation

- [ ] Update `ErrorBoundary` to show branded recovery UI
  - Current: likely generic React error boundary
  - Target: Nodbusiness-branded illustration + "Something went wrong" + "Refresh page" button
  - Include error ID (from Sentry) so user can report it

---

## Step 2 — Standardize API Error Handling

- [ ] Create `frontend-next/lib/errors.ts` — maps HTTP status codes to human messages
  ```ts
  export function getErrorMessage(status?: number, fallback?: string): string {
    if (!status) return "Check your connection and try again."
    if (status === 403) return "You don't have permission to do this."
    if (status === 404) return "This content doesn't exist or was removed."
    if (status === 429) return "Too many requests. Please wait a moment."
    if (status >= 500) return "Something went wrong on our end. Please try again."
    return fallback || "An unexpected error occurred."
  }
  ```

- [ ] Audit every `useQuery` / `useMutation` call — replace raw `error.message` with `getErrorMessage(error.status)`
- [ ] Every `isError` state in TanStack Query shows `<ErrorMessage>` with retry, not blank
- [ ] Every form mutation error shows a toast with human-readable message

---

## Step 3 — Form Validation

- [ ] Confirm all forms use React Hook Form + Zod
- [ ] All fields show validation error **on blur** (not just on submit)
- [ ] Error message appears below the field (not as a toast)
- [ ] Error state: red border (`border-destructive`), red message text
- [ ] Success state on blur for critical fields (email format ✓, password strength ✓)
- [ ] Submit button disabled while form is invalid (after first submit attempt)

---

## Step 4 — Offline Handling

- [ ] Add `<OfflineBanner />` to the root `(app)/layout.tsx`
- [ ] Disable form submit buttons when `navigator.onLine === false`
- [ ] Show "Saving failed — you're offline" on write operations that fail due to network

---

## Step 5 — Polish the 404 Page

- [ ] Check `app/not-found.tsx` design quality
- [ ] Must have: illustration/icon, friendly message, "Go Home" button
- [ ] Must NOT have: raw "404" as the main heading

---

## Step 6 — Test

- [ ] DevTools → Network → Offline: verify banner appears, buttons disable
- [ ] Force API errors via DevTools → verify inline error messages appear
- [ ] Submit forms with invalid data → verify field-level errors
- [ ] Break an ErrorBoundary intentionally → verify recovery UI
