# frontend-next/views/AccountSettings.tsx

## 1. What is this?

**Screen component (view layer).** Account-level preferences: email/password change, connected Google, session logout-all.

Size: roughly 239 lines of source.

## 2. Why does it exist?

Account-level preferences: email/password change, connected Google, session logout-all.

## 3. What does it do?

Implements the behavior described above as an interactive client-side module:
data flows through `api/client.ts` (silent token refresh), errors surface via
sonner toasts, and auth failures are handled globally by interceptors.

## 4. What does it touch?

**API endpoints:**
- `/api/client`
- `/api/entities`
- `/api/auth/change-password`
- `/api/messages/presence/settings`

**Integrations:** AuthContext (useAuth)

**Source file:** `frontend-next/views/AccountSettings`
