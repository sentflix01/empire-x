# frontend-next/views/EventCreate.tsx

## 1. What is this?

**Screen component (view layer).** Event authoring form: schedule, venue/map link, ticketing setup.

Size: roughly 85 lines of source.

## 2. Why does it exist?

Event authoring form: schedule, venue/map link, ticketing setup.

## 3. What does it do?

Implements the behavior described above as an interactive client-side module:
data flows through `api/client.ts` (silent token refresh), errors surface via
sonner toasts, and auth failures are handled globally by interceptors.

## 4. What does it touch?

**API endpoints:**
- `/api/entities`

**Integrations:** AuthContext (useAuth), zustand stores

**Source file:** `frontend-next/views/EventCreate`
