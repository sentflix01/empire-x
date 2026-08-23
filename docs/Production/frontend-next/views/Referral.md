# frontend-next/views/Referral.tsx

## 1. What is this?

**Screen component (view layer).** Referral program screen: personal code, share links, reward ledger.

Size: roughly 220 lines of source.

## 2. Why does it exist?

Referral program screen: personal code, share links, reward ledger.

## 3. What does it do?

Implements the behavior described above as an interactive client-side module:
data flows through `api/client.ts` (silent token refresh), errors surface via
sonner toasts, and auth failures are handled globally by interceptors.

## 4. What does it touch?

**API endpoints:**
- `/api/client`
- `/api/auth`
- `/api/referral/my-code`
- `/api/profiles/me`
- `/api/referral/apply`

**Source file:** `frontend-next/views/Referral`
