> ⚠️ **HISTORICAL** — corresponding source file was removed from the codebase on 2026-10-08. Kept for reference.

# frontend-next/views/Tasks.tsx

## 1. What is this?

**Screen component (view layer).** Task/gig marketplace browser with filters and bid entry points.

Size: roughly 178 lines of source.

## 2. Why does it exist?

Task/gig marketplace browser with filters and bid entry points.

## 3. What does it do?

Implements the behavior described above as an interactive client-side module:
data flows through `api/client.ts` (silent token refresh), errors surface via
sonner toasts, and auth failures are handled globally by interceptors.

## 4. What does it touch?

**API endpoints:**
- `/api/entities`

**Integrations:** AuthContext (useAuth)

**Source file:** `frontend-next/views/Tasks`
