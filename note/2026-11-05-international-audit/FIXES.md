# Fix log

Fixes made after the audit report (2026-11-06), one focused commit each. Finding
files stay as the audit recorded them; this log links each fix to its evidence.

| Finding | Fix | Test | Verified |
|---|---|---|---|
| F-040 (High) — Bookmarks request loop | `frontend-next/views/Bookmarks.tsx` loads once, keyed on a new `hasHydrated` flag in `store/bookmarksSlice.ts` | `frontend-next/test/bookmarks/BookmarksPage.hydrate-once.test.tsx` (failed before: 84 calls in 300 ms) | Production build: 1 request to `/api/saves` instead of 1,777 in 10 s (`evidence/wave4/bookmarks-after-fix.json`) |
