# frontend-next/api/client.ts

## 1. What is this?

**API client module.** Axios singleton: memory-only JWT, silent refresh dedupe, nb_auth hint cookie, normalized errors/timeouts. THE transport every call uses.

Size: roughly 178 lines of source.

## 2. Why does it exist?

Axios singleton: memory-only JWT, silent refresh dedupe, nb_auth hint cookie, normalized errors/timeouts. THE transport every call uses.

## 3. What does it do?

Implements the behavior described above as an interactive client-side module:
data flows through `api/client.ts` (silent token refresh), errors surface via
sonner toasts, and auth failures are handled globally by interceptors.

## 4. What does it touch?

**API endpoints:**
- `/api/auth/refresh`
- `/api/auth/`
- `/api/auth/me`
- `/api/auth/login`
- `/api/auth/logout`

**Integrations:** zustand

**Source file:** `frontend-next/api/client.ts`
