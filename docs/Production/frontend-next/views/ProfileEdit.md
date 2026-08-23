# frontend-next/views/ProfileEdit.tsx

## 1. What is this?

**Screen component (view layer).** Deep profile editor across personal/business tabs: identity fields, social links, template picker, verification request entry point.

Size: roughly 795 lines of source.

## 2. Why does it exist?

Deep profile editor across personal/business tabs: identity fields, social links, template picker, verification request entry point.

## 3. What does it do?

Implements the behavior described above as an interactive client-side module:
data flows through `api/client.ts` (silent token refresh), errors surface via
sonner toasts, and auth failures are handled globally by interceptors.

## 4. What does it touch?

**API endpoints:**
- `/api/entities`

**Integrations:** AuthContext (useAuth), zustand stores

**Source file:** `frontend-next/views/ProfileEdit`
