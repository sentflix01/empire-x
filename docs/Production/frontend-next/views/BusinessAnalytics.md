# frontend-next/views/BusinessAnalytics.tsx

## 1. What is this?

**Screen component (view layer).** Seller analytics dashboard: orders/revenue/views charts over business data.

Size: roughly 477 lines of source.

## 2. Why does it exist?

Seller analytics dashboard: orders/revenue/views charts over business data.

## 3. What does it do?

Implements the behavior described above as an interactive client-side module:
data flows through `api/client.ts` (silent token refresh), errors surface via
sonner toasts, and auth failures are handled globally by interceptors.

## 4. What does it touch?

**API endpoints:**
- `/api/entities`

**Integrations:** AuthContext (useAuth)

**Source file:** `frontend-next/views/BusinessAnalytics`
