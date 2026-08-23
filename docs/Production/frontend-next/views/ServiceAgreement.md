# frontend-next/views/ServiceAgreement.tsx

## 1. What is this?

**Screen component (view layer).** Seller service agreement acceptance flow gating selling features.

Size: roughly 261 lines of source.

## 2. Why does it exist?

Seller service agreement acceptance flow gating selling features.

## 3. What does it do?

Implements the behavior described above as an interactive client-side module:
data flows through `api/client.ts` (silent token refresh), errors surface via
sonner toasts, and auth failures are handled globally by interceptors.

## 4. What does it touch?

**Source file:** `frontend-next/views/ServiceAgreement`
