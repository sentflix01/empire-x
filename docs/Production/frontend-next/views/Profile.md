# frontend-next/views/Profile.tsx

## 1. What is this?

**Screen component (view layer).** Public/private profile view: cover/avatar, social links, tabs over posts/products/showrooms, follow button, verification badge display.

Size: roughly 352 lines of source.

## 2. Why does it exist?

Public/private profile view: cover/avatar, social links, tabs over posts/products/showrooms, follow button, verification badge display.

## 3. What does it do?

Implements the behavior described above as an interactive client-side module:
data flows through `api/client.ts` (silent token refresh), errors surface via
sonner toasts, and auth failures are handled globally by interceptors.

## 4. What does it touch?

**API endpoints:**
- `/api/auth`
- `/api/entities`
- `/api/client`
- `/api/profiles/me/ticker`

**Integrations:** AuthContext (useAuth)

**Source file:** `frontend-next/views/Profile`
