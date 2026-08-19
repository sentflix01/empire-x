# Global Standards Reference

> This document defines the exact standards every feature in Nodbusiness must meet.
> When in doubt, refer here before implementing anything.

---

## 1. Performance Standards

| Metric | Target | Measurement Tool |
|--------|--------|-----------------|
| LCP (Largest Contentful Paint) | < 2.5s | Chrome DevTools, Lighthouse |
| INP (Interaction to Next Paint) | < 200ms | Chrome DevTools |
| CLS (Cumulative Layout Shift) | < 0.1 | Chrome DevTools |
| TTFB (Time to First Byte) | < 800ms | Lighthouse |
| API response time (p95) | < 500ms | Server logs |
| WebSocket message delivery | < 500ms | Manual test |
| Search results | < 800ms | Network tab |
| Image load (above fold) | < 1s | Lighthouse |
| Page bundle size (gzipped) | < 200KB | next build output |

---

## 2. UX Standards

### Every Data-Fetching View Must Have:
1. **Skeleton loader** — shown while data is loading
2. **Empty state** — shown when data exists but is empty
3. **Error state** — shown when fetch fails, with retry button
4. **Optimistic updates** — mutations update UI before server responds

### Every Form Must Have:
1. **Field-level validation** — on blur, not just on submit
2. **Loading state** on submit button — disable + spinner while submitting
3. **Success feedback** — toast or redirect after success
4. **Error feedback** — inline error, not alert()
5. **16px minimum font size** on all inputs (prevents iOS zoom)

### Every List Must Have:
1. **Infinite scroll** or **pagination** — never load all records at once
2. **Sort options** — at minimum: newest first, oldest first
3. **Filter** — relevant to the content type
4. **Item count** shown ("23 results")

### Every Modal / Sheet Must Have:
1. **Backdrop click** to close
2. **Escape key** to close
3. **Focus trap** inside modal while open
4. **Focus return** to trigger element on close

---

## 3. API Standards

### Request/Response Shape
```json
// Success
{ "data": { ... }, "meta": { "total": 100, "page": 1 } }

// Error
{ "error": "Human-readable message", "code": "VALIDATION_ERROR" }
```

### HTTP Status Codes
- `200` — success
- `201` — resource created
- `400` — validation error (client mistake)
- `401` — not authenticated
- `403` — authenticated but not authorized
- `404` — resource not found
- `409` — conflict (duplicate)
- `429` — rate limited
- `500` — server error

### Pagination
- Query params: `?page=1&limit=20` or `?cursor=xxx&limit=20`
- Response includes: `total`, `page`, `limit`, `has_more`

---

## 4. Accessibility Standards (WCAG 2.1 AA)

| Rule | Requirement |
|------|-------------|
| Images | All `<img>` have `alt` text |
| Forms | All inputs have `<label>` or `aria-label` |
| Color contrast | 4.5:1 for text, 3:1 for large text (> 18px) |
| Keyboard | All actions completable without mouse |
| Focus | Visible focus ring on all interactive elements |
| Modals | Focus trap + focus return |
| Dynamic content | `aria-live` regions for updates |
| Buttons | Minimum 44×44px touch target |
| Links | Descriptive text (not "click here") |

---

## 5. Security Standards

| Area | Standard |
|------|----------|
| Auth | JWT access token (15min) + HttpOnly refresh cookie |
| Passwords | bcrypt, minimum 8 chars, strength meter |
| API | All mutating routes require `requireAuth` middleware |
| File uploads | Type validation (MIME), size limit (10MB), virus scan (future) |
| SQL | Parameterized queries only — no string concatenation |
| Rate limiting | Auth endpoints: 20 req/15min, general: 500 req/15min |
| CORS | Strict allowlist (no wildcard `*` in production) |
| CSP | Strict Content-Security-Policy headers |
| Secrets | Never in code, always in environment variables |

---

## 6. Code Quality Standards

| Area | Standard |
|------|----------|
| TypeScript | 0 errors, no `any` except for 3rd-party types |
| Components | Single responsibility — one job per component |
| File size | Max 300 lines per file — split if larger |
| Naming | PascalCase components, camelCase functions, UPPER_CASE constants |
| Imports | No circular imports, barrel exports from `index.ts` |
| Comments | Explain WHY, not WHAT. Code explains what. |
| Tests | Every new backend route has at least one happy-path + one error test |
| Error handling | Every async function has try/catch, no silent failures |

---

## 7. Design System Standards

| Element | Standard |
|---------|----------|
| Colors | Only CSS variables from `globals.css` — no hardcoded hex |
| Spacing | Tailwind scale only — no arbitrary `px` values |
| Radius | `rounded-lg` (8px) for cards, `rounded-md` (6px) for inputs, `rounded-full` for avatars |
| Shadows | `shadow-sm` for cards, `shadow-md` for modals, `shadow-lg` for dropdowns |
| Icons | Lucide React only — consistent size (16px inline, 20px UI, 24px navigation) |
| Animations | Framer Motion for entrance/exit, CSS transition for hover states |
| Dark mode | Every component must work in both light and dark mode |
