# frontend-next/components/feed/TickerBar.tsx

## 1. What is this?

**React component.** Scrolling announcement ticker fed by profile ticker_text.

Size: roughly 156 lines of source.

## 2. Why does it exist?

Scrolling announcement ticker fed by profile ticker_text.

## 3. What does it do?

Implements the behavior described above as an interactive client-side module:
data flows through `api/client.ts` (silent token refresh), errors surface via
sonner toasts, and auth failures are handled globally by interceptors.

## 4. What does it touch?

**Source file:** `frontend-next/components/feed/TickerBar.tsx`
