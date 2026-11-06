# Fix log

Fixes made after the audit report (2026-11-06), one focused commit each. Finding
files stay as the audit recorded them; this log links each fix to its evidence.

| Finding | Fix | Test | Verified |
|---|---|---|---|
| F-040 (High) — Bookmarks request loop | `frontend-next/views/Bookmarks.tsx` loads once, keyed on a new `hasHydrated` flag in `store/bookmarksSlice.ts` | `frontend-next/test/bookmarks/BookmarksPage.hydrate-once.test.tsx` (failed before: 84 calls in 300 ms) | Production build: 1 request to `/api/saves` instead of 1,777 in 10 s (`evidence/wave4/bookmarks-after-fix.json`) |
| F-001 (High) — product photos could not be uploaded | New `POST /api/upload/multiple` in `backend/routes/upload.ts` (up to 10 files, same content check as the single route, all-or-nothing); single-file route refactored onto the same helpers | `backend/__tests__/uploadMultipleRoute.test.ts` (7 cases) | Browser on the production build: `POST /api/upload/multiple → 200`, two previews, no error (`evidence/wave3/F-001-after-fix.png`) |
