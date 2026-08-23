# frontend-next/components/showroom/DataSourceStatusPanel.tsx

## 1. What is this?

**React component.** Health surface for a section source: last fetch status/latency from external_health_records.

Size: roughly 246 lines of source.

## 2. Why does it exist?

Health surface for a section source: last fetch status/latency from external_health_records.

## 3. What does it do?

Implements the behavior described above as an interactive client-side module:
data flows through `api/client.ts` (silent token refresh), errors surface via
sonner toasts, and auth failures are handled globally by interceptors.

## 4. What does it touch?

**API endpoints:**
- `/api/showrooms/${showroomId}/external-sources/health`
- `/api/showrooms/${showroomId}/external-sources/${sourceId}/refresh`

**Source file:** `frontend-next/components/showroom/DataSourceStatusPanel.tsx`
