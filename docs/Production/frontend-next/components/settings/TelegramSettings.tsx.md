# frontend-next/components/settings/TelegramSettings.tsx

## 1. What is this?

**React component.** Telegram chat-id linkage UI for seller notifications.

Size: roughly 144 lines of source.

## 2. Why does it exist?

Telegram chat-id linkage UI for seller notifications.

## 3. What does it do?

Implements the behavior described above as an interactive client-side module:
data flows through `api/client.ts` (silent token refresh), errors surface via
sonner toasts, and auth failures are handled globally by interceptors.

## 4. What does it touch?

**API endpoints:**
- `/api/client`
- `/api/telegram/status`
- `/api/telegram/notifications`
- `/api/telegram/disconnect`

**Source file:** `frontend-next/components/settings/TelegramSettings.tsx`
