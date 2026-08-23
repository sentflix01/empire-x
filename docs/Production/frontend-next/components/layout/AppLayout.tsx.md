# frontend-next/components/layout/AppLayout.tsx

## 1. What is this?

**React component.** The app shell: responsive nav (sidebar desktop / bottom tabs mobile), header search, notification bell wiring, auth-gated layout wrapping every authenticated screen.

Size: roughly 976 lines of source.

## 2. Why does it exist?

The app shell: responsive nav (sidebar desktop / bottom tabs mobile), header search, notification bell wiring, auth-gated layout wrapping every authenticated screen.

## 3. What does it do?

Implements the behavior described above as an interactive client-side module:
data flows through `api/client.ts` (silent token refresh), errors surface via
sonner toasts, and auth failures are handled globally by interceptors.

## 4. What does it touch?

**API endpoints:**
- `/api/entities`
- `/api/client`
- `/api/trending/warm`
- `/api/trending`
- `/api/posts`
- `/api/profiles`

**Integrations:** useAuth, Socket.IO

**Source file:** `frontend-next/components/layout/AppLayout.tsx`
