# frontend-next/api/auth.ts

## 1. What is this?

**API client module.** Auth-specific calls (login/me) returning tokens handled by client storeToken.

Size: roughly 91 lines of source.

## 2. Why does it exist?

Auth-specific calls (login/me) returning tokens handled by client storeToken.

## 3. What does it do?

Implements the behavior described above as an interactive client-side module:
data flows through `api/client.ts` (silent token refresh), errors surface via
sonner toasts, and auth failures are handled globally by interceptors.

## 4. What does it touch?

**API endpoints:**
- `/api/auth/me`
- `/api/auth/login`
- `/api/auth/register`
- `/api/auth/verify-otp`
- `/api/auth/resend-otp`
- `/api/auth/forgot-password`

**Source file:** `frontend-next/api/auth.ts`
