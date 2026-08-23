# frontend-next/lib/googleAuth.ts

## 1. What is this?

**Shared frontend library.** Google Identity Services button/loader for OAuth id_token flow.

Size: roughly 136 lines of source.

## 2. Why does it exist?

Google Identity Services button/loader for OAuth id_token flow.

## 3. What does it do?

Implements the behavior described above as an interactive client-side module:
data flows through `api/client.ts` (silent token refresh), errors surface via
sonner toasts, and auth failures are handled globally by interceptors.

## 4. What does it touch?

**API endpoints:**
- `/api/client`
- `/api/auth/google`

**Source file:** `frontend-next/lib/googleAuth.ts`
