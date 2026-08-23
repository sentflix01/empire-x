# frontend-next/views/Orders.tsx

## 1. What is this?

**Screen component (view layer).** Order history for buyer and seller roles with status badges and timeline links into delivery tracking.

Size: roughly 588 lines of source.

## 2. Why does it exist?

Order history for buyer and seller roles with status badges and timeline links into delivery tracking.

## 3. What does it do?

Implements the behavior described above as an interactive client-side module:
data flows through `api/client.ts` (silent token refresh), errors surface via
sonner toasts, and auth failures are handled globally by interceptors.

## 4. What does it touch?

**API endpoints:**
- `/api/entities`
- `/api/client`
- `/api/delivery/${orderId}`
- `/api/returns`
- `/api/returns/${rr.id}`
- `/api/profiles`

**Integrations:** AuthContext (useAuth)

**Source file:** `frontend-next/views/Orders`
