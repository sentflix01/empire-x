# frontend-next/lib/AuthContext.tsx

## 1. What is this?

**Shared frontend library.** Auth state provider: boot re-hydration via silent refresh (TD-014), user/isAuthenticated flags, logout with server revocation. Real null-guarded context.

Size: roughly 118 lines of source.

## 2. Why does it exist?

Auth state provider: boot re-hydration via silent refresh (TD-014), user/isAuthenticated flags, logout with server revocation. Real null-guarded context.

## 3. What does it do?

Implements the behavior described above as an interactive client-side module:
data flows through `api/client.ts` (silent token refresh), errors surface via
sonner toasts, and auth failures are handled globally by interceptors.

## 4. What does it touch?

**API endpoints:**
- `/api/client`
- `/api/auth/me`
- `/api/auth/logout`

**Integrations:** useAuth

**Source file:** `frontend-next/lib/AuthContext.tsx`
