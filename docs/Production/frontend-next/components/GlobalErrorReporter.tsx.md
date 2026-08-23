# frontend-next/components/GlobalErrorReporter.tsx

## 1. What is this?

**React component.** Global window error/unhandledrejection listeners posting to backend error feed; exports reportClientError used by error boundaries.

Size: roughly 108 lines of source.

## 2. Why does it exist?

Global window error/unhandledrejection listeners posting to backend error feed; exports reportClientError used by error boundaries.

## 3. What does it do?

Implements the behavior described above as an interactive client-side module:
data flows through `api/client.ts` (silent token refresh), errors surface via
sonner toasts, and auth failures are handled globally by interceptors.

## 4. What does it touch?

**API endpoints:**
- `/api/devops/errors/report`
- `/api/devops/`

**Source file:** `frontend-next/components/GlobalErrorReporter.tsx`
