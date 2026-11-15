# Feed Spotlight and the return visit — test report, 15 Nov 2026

Owner's reports:

1. "When I click the preview, then tick the check list back and forth, it
   disappears on the spotlight preview."
2. "Test what happens after the owner publishes, then comes back another time
   to update the showroom, from scratch or any part."

## How it was tested

| Script | What it does |
|---|---|
| `spotlight-fuzz.mjs` | Random, seeded action sequences in the Spotlight dialog: tick, untick, ↑/↓, click preview tabs, switch modes, Cancel and reopen. Runs at 390, 768 and 1366 px, on the premium sample and on a saved site with half-filled rows. After **every** action it checks four things: the strip is shown, the tab count matches the ticked sections that have content, the header agrees, and the strip is in view. |
| `edit-after-publish.mjs` | An owner's visits on separate devices (fresh browser each time), at 1366 and 390 px, with a signed-out visitor checking the public page after each publish (see V1–V6 below). |
| Unit tests | `test/showroom/spotlightStable.test.tsx` (including a 2,000-case property test) and `test/showroom/editReturn.test.tsx`. |

## Results

| Check | Before | After |
|---|---|---|
| Spotlight fuzz (seed 20261115, 6 seq × 15 steps × 3 widths × 2 setups) | **23 failures**: the strip was replaced by "This business hasn't added…" while ticked sections had content | 0 failures (413 actions) |
| Spotlight fuzz (seed 4242, 12 × 18 × 3 × 2) | — | see the PR |
| Return journey, 1366 px | 26/27: an unpublished change was lost | **32/32** |
| Return journey, 390 px | — | **32/32** |

## Findings and fixes

| # | Sev | Finding | Fix |
|---|---|---|---|
| F1 | S1 | **The preview disappeared.** "Has content" (`sectionHasContent`) and "draws a card" (`spotlightTiles`) were two different rules. Rows with no text (a number with no value, a service with no name, a question with no text) counted as content but drew nothing. When such a tab became first or active, the strip showed the empty card instead of all tabs. | One rule: a section has content exactly when it draws at least one card. Catalogue sections still need products, offers must be running, and Automatic still wants a picture for About. A property test over 2,000 random half-filled sections checks it. |
| F2 | S1 | **The premium sample's "Our numbers" was blank everywhere.** The sample stored `value`, while the form, the public page and the cards read `number`. Sites published from the sample showed empty boxes to visitors. | The samples use `number`. The page and the cards also read the old `value`. Studio maps `value` to `number` when it opens such a site, so the owner sees and keeps the numbers. |
| F3 | S1 | One tab with no cards blanked the **whole** strip. | Slides that draw nothing are dropped. The empty card shows only when nothing at all can be drawn. |
| F4 | S2 | The active tab was kept by position, so adding, removing or moving another tab switched what was shown. | The active tab is remembered by section and falls back to the first tab. |
| F5 | S2 | The tab row called `scrollIntoView` on every render, which scrolled the preview pane and the page while ticking. | Only the tab row scrolls sideways, and only when the active tab changes. |
| F6 | S2 | Products were fetched only if the **first** render needed them, so a catalogue tab ticked later never loaded. | Products load whenever they are first needed. |
| F7 | S3 | The preview header ("5 tabs") and the panel's "N tabs selected" counted sections that draw nothing. | Both count what the strip really draws: the strip reports back to the preview. The panel says how many more tabs will appear once they have content. |
| F8 | S1 | **Return visit lost work.** Editing a live site auto-saved "on this device", but the next visit always opened the live version, so the change was silently gone. | Studio brings the change back with a bar: "Not live yet … press Update" and **Discard changes**. |
| F9 | S1 | **Live-site edits went into the new-site draft.** Edits to a live site were stored under the same device key as a new site, so "Create showroom" could reopen them as a new site, and publishing that would duplicate the site. | Each site being edited has its own device key. |
| F10 | S2 | Two devices: an older device copy could be applied on top of a newer live version. | Device changes record which live version they started from. If the site was updated since, the newer live version opens and a bar says "Updated elsewhere", with **Use my older changes** / **Keep live version**. The older changes are kept until the owner chooses. |

## Return journey: what now works

| Visit | Result |
|---|---|
| V1: publish from scratch | Live. Visitors see the name and the one line. |
| V2: new device: Edit, change the one line, add About us, remove a section, move a section, custom colour, Spotlight tabs + Save, Update | Same web address, still live. Visitors see every change, the new colour and the Spotlight choice. |
| V3: edit and leave without Update | Visitors still see the live site. Back on the same device the change returns with "Not live yet". Discard restores the live version. Nothing reaches the new-site draft. |
| V4: second device updates | A visitor sees it. The first device opens the newer version and offers its older changes. "Use my older changes" restores them. |
| V5: Start over (Clear draft), rebuild, Update | Blank canvas with no sample content, the same web address, the old content gone for visitors, and no duplicate site. |
| V6: Unpublish → Publish again | Visitors lose the site, then get it back. |
