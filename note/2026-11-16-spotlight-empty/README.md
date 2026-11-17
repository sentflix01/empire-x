# Spotlight: ticked sections that did not show (owner, 16 Nov 2026)

- **Report:** in the Feed Spotlight dialog, ticking sections did not add them to the preview, and the feed card would not go from one tab to several.
- **Finding:** the owner's live site (public API, read-only) stored `spotlight_mode: carousel` with `offer, video, about, features`, so saving worked. Only Video had content:
  - the offer had no words and its last day was 28 Oct;
  - About and Why choose us were empty.
- **Fix:** each ticked section that can't show yet says what it needs and has a **Fill it in** button that opens its form. See DECISIONS 2026-11-16.
- **Replay:** `owner-site-run.mjs` (local stack only) recreates the same site, checks the reasons, uses Fill it in, publishes and reads the feed card. 11/11 checks pass; screenshots are in `shots/`.

## 17 Nov 2026 follow-up
- **Report:**
  - the Studio preview showed only Video, although all four sections were ticked;
  - the feed card's Video tab was blank under its title.
- **Fix:**
  - the owner's preview shows every ticked tab; empty ones are dashed, with Fill it in, and visitors only see filled tabs;
  - the Video tab shows the YouTube thumbnail and plays in the card.
- **Replay:** 15/15 checks pass. This sandbox blocks YouTube, so the script serves a stand-in for the thumbnail address; real browsers load the real picture. New shots: `1b-about-dashed-tab.png`, `5-video-thumbnail.png`, `6-video-playing.png`.
- **Second follow-up (17 Nov):** the owner wanted the feed card to show the same tabs as the preview, and chose "show every ticked tab".
  - The feed now shows all ticked tabs. An empty About uses the business description; other empty tabs show "See more on our page" with Visit.
  - Replay: 17/17 checks pass; new shot `4b-feed-why-us.png`.
