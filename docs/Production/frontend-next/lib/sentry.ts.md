# frontend-next/lib/sentry.ts

## 1. What is this?

**Shared frontend library.** Frontend Sentry loader - dynamic import, silently no-ops when DSN unset (@sentry/nextjs not installed; TD-011).

Size: roughly 64 lines of source.

## 2. Why does it exist?

Frontend Sentry loader - dynamic import, silently no-ops when DSN unset (@sentry/nextjs not installed; TD-011).

## 3. What does it do?

Implements the behavior described above as an interactive client-side module:
data flows through `api/client.ts` (silent token refresh), errors surface via
sonner toasts, and auth failures are handled globally by interceptors.

## 4. What does it touch?

**Source file:** `frontend-next/lib/sentry.ts`
