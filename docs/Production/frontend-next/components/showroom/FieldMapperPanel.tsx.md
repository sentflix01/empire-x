# frontend-next/components/showroom/FieldMapperPanel.tsx

## 1. What is this?

**React component.** Declarative mapping editor: paste sample response, live per-row resolved values, clickable detected keys, save/delete mappings via API.

Size: roughly 449 lines of source.

## 2. Why does it exist?

Declarative mapping editor: paste sample response, live per-row resolved values, clickable detected keys, save/delete mappings via API.

## 3. What does it do?

Implements the behavior described above as an interactive client-side module:
data flows through `api/client.ts` (silent token refresh), errors surface via
sonner toasts, and auth failures are handled globally by interceptors.

## 4. What does it touch?

**API endpoints:**
- `/api/showrooms/${showroomId}/external-sources/${sourceId}/mappings`
- `/api/proxy/${showroomId}/${sectionKey}`
- `/api/showrooms/${showroomId}/external-sources/${sourceId}/mappings/${mappingId}`

**Source file:** `frontend-next/components/showroom/FieldMapperPanel.tsx`
