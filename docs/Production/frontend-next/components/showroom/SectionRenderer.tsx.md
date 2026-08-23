# frontend-next/components/showroom/SectionRenderer.tsx

## 1. What is this?

**React component.** Renders one showroom section by type - the heart of the website builder presentation layer (Patent 4 render surface).

Size: roughly 716 lines of source.

## 2. Why does it exist?

Renders one showroom section by type - the heart of the website builder presentation layer (Patent 4 render surface).

## 3. What does it do?

Implements the behavior described above as an interactive client-side module:
data flows through `api/client.ts` (silent token refresh), errors surface via
sonner toasts, and auth failures are handled globally by interceptors.

## 4. What does it touch?

**Source file:** `frontend-next/components/showroom/SectionRenderer.tsx`
