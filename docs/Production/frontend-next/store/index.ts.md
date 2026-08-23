# frontend-next/store/index.ts

## 1. What is this?

**State store slice.** Zustand root composing slices with persistence.

Size: roughly 37 lines of source.

## 2. Why does it exist?

Zustand root composing slices with persistence.

## 3. What does it do?

Implements the behavior described above as an interactive client-side module:
data flows through `api/client.ts` (silent token refresh), errors surface via
sonner toasts, and auth failures are handled globally by interceptors.

## 4. What does it touch?

**Integrations:** zustand

**Source file:** `frontend-next/store/index.ts`
