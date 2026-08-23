# frontend-next/views/Admin.tsx

## 1. What is this?

**Screen component (view layer).** Admin control center: stats overview, user management (ban/unban), verifications queue, revenue charts, content tables.

Size: roughly 962 lines of source.

## 2. Why does it exist?

Admin control center: stats overview, user management (ban/unban), verifications queue, revenue charts, content tables.

## 3. What does it do?

Implements the behavior described above as an interactive client-side module:
data flows through `api/client.ts` (silent token refresh), errors surface via
sonner toasts, and auth failures are handled globally by interceptors.

## 4. What does it touch?

**API endpoints:**
- `/api/client`
- `/api/devops/stats`
- `/api/flags`
- `/api/flags/${name}`
- `/api/admin/stats`
- `/api/admin/users`
- `/api/admin/verifications`
- `/api/admin/posts`

**Integrations:** AuthContext (useAuth)

**Source file:** `frontend-next/views/Admin`
