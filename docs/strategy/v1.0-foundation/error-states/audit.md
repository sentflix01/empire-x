# Error States — Audit

## Categories of Errors

### 1. API / Network Errors
When a fetch fails — network timeout, server 500, 404, 403.

### 2. Form Validation Errors
When a user submits invalid input — wrong format, missing field, conflict.

### 3. Page-Level Errors
Unhandled exceptions caught by ErrorBoundary.

### 4. Auth Errors
Token expired, unauthorized, banned account.

---

## Current State

| Error Type | Current Handling | Global Standard |
|-----------|-----------------|-----------------|
| API fetch fails | Likely `console.error` or generic toast | Inline error message + Retry button |
| Form validation | Basic HTML5 or Zod on submit | Real-time field-level validation with clear message |
| Page crash | ErrorBoundary present on 45 views | ✅ Good — but recovery UX unknown |
| 401 Unauthorized | Redirect to login (Axios interceptor) | ✅ Good |
| 403 Forbidden | Unknown | "You don't have permission" message |
| 404 Not Found | `not-found.tsx` exists | Check design quality |
| Network offline | Unknown | Offline banner + disable submit buttons |
| Server 500 | Unknown | "Something went wrong" + retry |
| Rate limited (429) | Unknown | "Too many requests, try again in X seconds" |

---

## Target: Error State Standards

### API Error Pattern
```
[Error Icon]
[Clear Title]         ← "Couldn't load your feed"
[Human Description]   ← "Check your connection and try again."
[Retry Button]        ← Re-triggers the fetch
```

### Form Error Pattern
- Field-level: red border + message below the field, immediately on blur
- Submit-level: toast OR error summary at top of form
- Never: alert() dialog

### Network Offline Pattern
- Sticky banner at top: "You're offline. Some features may not work."
- Disappears automatically when connection restored
- Form submit buttons disabled when offline

### Error Message Tone (Global Standard)
- ❌ "Error 500: Internal Server Error"
- ✅ "Something went wrong on our end. Please try again."
- ❌ "Failed to fetch"
- ✅ "Couldn't load this content. Check your connection."
- ❌ "Unauthorized"
- ✅ "Please sign in to continue."
