# frontend-next/components/showroom/ExternalDataSourcePanel.tsx

## 1. What is this?

**React component.** Tenant UI to register/edit an external HTTPS source: URL, auth mode, credential (vaulted server-side), TTL.

Size: roughly 492 lines of source.

## 2. Why does it exist?

Tenant UI to register/edit an external HTTPS source: URL, auth mode, credential (vaulted server-side), TTL.

## 3. What does it do?

Implements the behavior described above as an interactive client-side module:
data flows through `api/client.ts` (silent token refresh), errors surface via
sonner toasts, and auth failures are handled globally by interceptors.

## 4. What does it touch?

**API endpoints:**
- `/api/showrooms/${showroomId}/external-sources`

**Source file:** `frontend-next/components/showroom/ExternalDataSourcePanel.tsx`
