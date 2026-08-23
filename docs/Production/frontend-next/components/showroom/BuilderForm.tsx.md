# frontend-next/components/showroom/BuilderForm.tsx

## 1. What is this?

**React component.** Builder editing form coordinating section settings and data-source configuration.

Size: roughly 408 lines of source.

## 2. Why does it exist?

Builder editing form coordinating section settings and data-source configuration.

## 3. What does it do?

Implements the behavior described above as an interactive client-side module:
data flows through `api/client.ts` (silent token refresh), errors surface via
sonner toasts, and auth failures are handled globally by interceptors.

## 4. What does it touch?

**API endpoints:**
- `/api/showrooms/${showroomId}/external-sources`

**Source file:** `frontend-next/components/showroom/BuilderForm.tsx`
