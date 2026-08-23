# frontend-next/views/Businesses.tsx

## 1. What is this?

**Screen component (view layer).** Business directory/listing management for owners.

Size: roughly 390 lines of source.

## 2. Why does it exist?

Business directory/listing management for owners.

## 3. What does it do?

Implements the behavior described above as an interactive client-side module:
data flows through `api/client.ts` (silent token refresh), errors surface via
sonner toasts, and auth failures are handled globally by interceptors.

## 4. What does it touch?

**API endpoints:**
- `/api/client`
- `/api/auth/me`
- `/api/profiles/me/follows`
- `/api/businesses`
- `/api/profiles/by-user/${uid}`

**Source file:** `frontend-next/views/Businesses`
