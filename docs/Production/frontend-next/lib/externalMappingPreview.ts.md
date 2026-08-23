# frontend-next/lib/externalMappingPreview.ts

## 1. What is this?

**Shared frontend library.** Client twin of backend mapping engine powering the live-preview mapping editor (Patent 4 embodiment).

Size: roughly 104 lines of source.

## 2. Why does it exist?

Client twin of backend mapping engine powering the live-preview mapping editor (Patent 4 embodiment).

## 3. What does it do?

Implements the behavior described above as an interactive client-side module:
data flows through `api/client.ts` (silent token refresh), errors surface via
sonner toasts, and auth failures are handled globally by interceptors.

## 4. What does it touch?

**Source file:** `frontend-next/lib/externalMappingPreview.ts`
