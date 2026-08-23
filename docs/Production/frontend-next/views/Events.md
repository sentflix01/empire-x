# frontend-next/views/Events.tsx

## 1. What is this?

**Screen component (view layer).** Event discovery list plus ticket purchase/RSVP entry.

Size: roughly 122 lines of source.

## 2. Why does it exist?

Event discovery list plus ticket purchase/RSVP entry.

## 3. What does it do?

Implements the behavior described above as an interactive client-side module:
data flows through `api/client.ts` (silent token refresh), errors surface via
sonner toasts, and auth failures are handled globally by interceptors.

## 4. What does it touch?

**API endpoints:**
- `/api/entities`
- `/api/client`
- `/api/events/${event.id}/book`

**Integrations:** AuthContext (useAuth)

**Source file:** `frontend-next/views/Events`
