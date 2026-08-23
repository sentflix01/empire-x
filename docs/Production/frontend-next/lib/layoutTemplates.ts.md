# frontend-next/lib/layoutTemplates.ts

## 1. What is this?

**Shared frontend library.** Showroom layout template definitions (e.g., Empire Elegant) consumed by wizard/renderer.

Size: roughly 109 lines of source.

## 2. Why does it exist?

Showroom layout template definitions (e.g., Empire Elegant) consumed by wizard/renderer.

## 3. What does it do?

Implements the behavior described above as an interactive client-side module:
data flows through `api/client.ts` (silent token refresh), errors surface via
sonner toasts, and auth failures are handled globally by interceptors.

## 4. What does it touch?

**Source file:** `frontend-next/lib/layoutTemplates.ts`
