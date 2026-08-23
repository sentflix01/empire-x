# frontend-next/components/showroom/BuilderPreview.tsx

## 1. What is this?

**React component.** Live preview pane rendering sections as the tenant edits them.

Size: roughly 476 lines of source.

## 2. Why does it exist?

Live preview pane rendering sections as the tenant edits them.

## 3. What does it do?

Implements the behavior described above as an interactive client-side module:
data flows through `api/client.ts` (silent token refresh), errors surface via
sonner toasts, and auth failures are handled globally by interceptors.

## 4. What does it touch?

**Source file:** `frontend-next/components/showroom/BuilderPreview.tsx`
