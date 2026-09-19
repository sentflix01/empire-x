# fix: socket HMR spam — guard against React Strict Mode remount churn

> **Type:** Bugfix · **Date:** 2026-09-18 · **Branch:** `feat/personal-business-toggle-auth-port-fixes` · **Status:** ✅ Committed

## Root cause

React Strict Mode (`reactStrictMode: true` in `next.config.ts`) intentionally double-invokes effects in development: mount → unmount → remount. The `connectSocket()` / `disconnectSocket()` pair in `AppLayout.tsx`'s `useEffect([user])` ran on every cycle.

`disconnectSocket()` was setting `socket = null` (destroying the singleton). The remount immediately created a new Socket.IO instance and connected it. Rapid WebSocket creation/destruction disrupted the browser's WebSocket connection pool, causing Next.js HMR's WebSocket to disconnect and reconnect repeatedly → `[HMR] connected` spam every ~1 second.

The `MaxListenersExceededWarning` ("11 close listeners added") was a secondary symptom: each new socket instance added a `new_notification` listener without the old ones being properly removed.

## Fix

### `frontend-next/lib/socket.ts`

- `disconnectSocket()` now calls `socket.removeAllListeners()` + `socket.disconnect()` but **does NOT null the singleton**. This is safe for the Strict Mode unmount path — the socket is cleaned up but reusable.
- Added `resetSocket()` — hard-resets the singleton (nulls it). Only called on deliberate logout so the next login gets a fresh socket with the new auth token.
- Added reconnection delay settings (`reconnectionDelay: 2000`, `reconnectionDelayMax: 10000`) to prevent aggressive reconnect loops from interfering with HMR.
- Added `removeAllListeners` to the SSR no-op stub.
- `connectSocket()` guards: `if (s.connected || s.connecting) return` — prevents duplicate connections from Strict Mode double-invoke.

### `frontend-next/components/layout/AppLayout.tsx`

- Import `resetSocket` alongside `disconnectSocket`.
- Both logout buttons (desktop + mobile drawer) now call `resetSocket()` before `logout()`.

## Result

- `[HMR] connected` spam eliminated in development.
- `MaxListenersExceededWarning` eliminated.
- Socket cleanup is correct on both Strict Mode unmount (remove listeners only) and logout (full reset).
