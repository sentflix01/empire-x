# frontend-next — Architecture & Data Flow

## 1. What is this?

**Documentation page.** How the frontend is wired: layers, state ownership, auth lifecycle, realtime.

## 2. Why does it exist?

How the frontend is wired: layers, state ownership, auth lifecycle, realtime.

## 3. What does it do?

## Layers (outside-in)
1. `app/` - App Router: 59 thin page wrappers + root layout/providers + error boundaries
2. `proxy.ts` (Next middleware) - route gating via non-sensitive nb_auth hint cookie
3. `views/` - 47 screen components holding page logic
4. `components/` - domain widgets + shadcn primitives
5. `lib/ + store/ + api/ + hooks/` - infrastructure

## State ownership
| Concern | Owner | Persistence |
|---|---|---|
| Auth user/session | AuthContext (+zustand authSlice mirror) | memory only; HttpOnly refresh cookie |
| Cart | CartContext over zustand cartSlice | persisted |
| Bookmarks | zustand bookmarksSlice | persisted; hydrate from /api/saves |
| Server data | TanStack Query | cache only |
| Realtime | Socket.IO singleton | none |

## Auth lifecycle (TD-014)
Login -> access token IN MEMORY + nb_auth hint cookie set. Boot: ensureFreshToken()
POSTs /api/auth/refresh using the HttpOnly cookie, rehydrating memory silently.
401 on any call triggers one deduped refresh+retry, else clears and redirects.
The JWT never touches localStorage or JS-readable cookies.

## Realtime
socket.ts singleton joins `user:{id}` rooms; events new_message/new_notification/
presence_updated drive chat + badges. Handshake requires an ACCESS token with
server-side revocation/ban checks.

## Styling & i18n
Tailwind v4 tokens from globals.css (brand purple/amber); i18next flat locales
en/am single namespace.

## 4. What does it touch?

**Files referenced:**
- `proxy.ts`
