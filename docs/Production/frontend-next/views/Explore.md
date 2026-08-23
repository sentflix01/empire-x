# frontend-next/views/Explore.tsx

## 1. What is this?

**Screen component (view layer).** Discovery hub mixing trending content, suggested users and hashtags — the browsing surface for new connections.

Size: roughly 207 lines of source.

## 2. Why does it exist?

Discovery hub mixing trending content, suggested users and hashtags — the browsing surface for new connections.

## 3. What does it do?

Implements the behavior described above as an interactive client-side module:
data flows through `api/client.ts` (silent token refresh), errors surface via
sonner toasts, and auth failures are handled globally by interceptors.

## 4. What does it touch?

**API endpoints:**
- `/api/client`
- `/api/trending`
- `/api/hashtags/trending`

**Integrations:** AuthContext (useAuth)

**Source file:** `frontend-next/views/Explore`
