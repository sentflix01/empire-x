# frontend-next/views/ShowroomView.tsx

## 1. What is this?

**Screen component (view layer).** Public storefront renderer: composes SectionRenderer sections bound to platform data or external APIs (Patent 4 render surface).

Size: roughly 298 lines of source.

## 2. Why does it exist?

Public storefront renderer: composes SectionRenderer sections bound to platform data or external APIs (Patent 4 render surface).

## 3. What does it do?

Implements the behavior described above as an interactive client-side module:
data flows through `api/client.ts` (silent token refresh), errors surface via
sonner toasts, and auth failures are handled globally by interceptors.

## 4. What does it touch?

**API endpoints:**
- `/api/entities`
- `/api/client`
- `/api/messages/inquiry`
- `/api/notifications`
- `/api/showrooms/slug/${slugParam}`

**Integrations:** AuthContext (useAuth)

**Source file:** `frontend-next/views/ShowroomView`
