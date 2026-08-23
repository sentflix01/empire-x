# frontend-next/views/PrivacyAndSecurity.tsx

## 1. What is this?

**Screen component (view layer).** Privacy controls surface: data download request, blocklist management, security status.

Size: roughly 301 lines of source.

## 2. Why does it exist?

Privacy controls surface: data download request, blocklist management, security status.

## 3. What does it do?

Implements the behavior described above as an interactive client-side module:
data flows through `api/client.ts` (silent token refresh), errors surface via
sonner toasts, and auth failures are handled globally by interceptors.

## 4. What does it touch?

**API endpoints:**
- `/api/client`
- `/api/messages/presence/settings`
- `/api/auth/me`

**Integrations:** AuthContext (useAuth)

**Source file:** `frontend-next/views/PrivacyAndSecurity`
