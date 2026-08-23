# frontend-next/store/bookmarksSlice.ts

> Bookmarks store: hydrate/toggleSave with prototype-pollution-safe writes (TD-021) and rollback-on-failure.

## Facts
- Size: ~127 lines
- API endpoints touched:
  - `/api/client`
  - `/api/saves`
  - `/api/saves/toggle`
- Integrations: zustand

## Notes
- Client-side module; auth handled globally by api/client interceptors.
