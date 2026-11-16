# Spotlight: ticked sections that did not show (owner, 16 Nov 2026)

- **Report:** in the Feed Spotlight dialog, ticking sections did not add them to the preview, and the feed card would not go from one tab to several.
- **Finding:** the owner's live site (public API, read-only) stored `spotlight_mode: carousel` with `offer, video, about, features`, so saving worked. Only Video had content:
  - the offer had no words and its last day was 28 Oct;
  - About and Why choose us were empty.
- **Fix:** each ticked section that can't show yet says what it needs and has a **Fill it in** button that opens its form. See DECISIONS 2026-11-16.
- **Replay:** `owner-site-run.mjs` (local stack only) recreates the same site, checks the reasons, uses Fill it in, publishes and reads the feed card. 11/11 checks pass; screenshots are in `shots/`.
