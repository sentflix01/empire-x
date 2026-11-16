# frontend-next/components/showroom/studio/FeedSpotlightPanel

<!-- AUTO-STUB  2026-10-22 — curate narrative below -->

## 1. What is this?

**React component.** The Showroom Studio panel where an owner chooses what the
Feed Spotlight strip on their business card shows: Automatic, chosen sections
(two or more play as tabs) or Off.

Size: roughly 240 lines of source.

## 2. Why does it exist?

Newly introduced as part of recent development; see source and git history for the introducing commit.

## 3. What does it do?

Saving (fixed 2026-11-16, `test/showroom/feedSpotlightPanel.test.tsx`):
- Each change saves with `PATCH /api/showrooms/:id/spotlight` after an 800 ms
  debounce. A change still waiting when the panel closes is sent at once with
  `keepalive`, so "pick, then close" is not lost.
- `apiFetch` does not throw on HTTP errors, so the panel checks `res.ok`. A
  refused or failed save shows the server's message (or "Could not save your
  Spotlight choice. Try again.") and does not call `onSaved`.
- With no showroom id (demo or unsaved draft) the panel is preview-only and
  sends nothing.

Extracted facts (auto):
- Lines: ~205
- API references:
  - `/api/client`
  - `/api/showrooms/${showroomId}/spotlight`

## 4. What does it touch?

**Source:** `frontend-next/components/showroom/studio/FeedSpotlightPanel.tsx`
