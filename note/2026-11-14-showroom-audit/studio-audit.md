# Studio (create showroom) audit — 14 Nov 2026

Owner's request: "this create showroom page is the main engine of this
project… deep audit as a senior tester, then fix as a senior full-stack
developer… everything neat and professional, global level."

Scope: the wizard (category → template → Customize) and Showroom Studio
(top bar, Sections, Edit, Preview, Style, More, Feed Spotlight, full-screen
preview, publish), at 360/390 (phone), 768 (tablet), 1024 (small laptop)
and 1440 px (desktop), on the local stack with a real owner account.

## Method

| Tool | What it checks | Script |
|---|---|---|
| Studio audit | every Studio state × 4 widths: console errors, axe WCAG 2.2 AA (serious/critical), sideways scroll, menus cut by the screen edge, controls covered by other elements, screenshots, load time | `studio-audit.mjs` |
| Controls scan | 18 pages × 4 widths: stretched, misshapen and too-small (< 24 px, WCAG 2.5.8) controls | `controls-scan.mjs` |
| Spotlight run | the Feed Spotlight journey end to end (choose, reorder, Save/Cancel, Esc, reopen, colours, phone), axe on the dialog | `spotlight-run.mjs` |
| Unit / component tests | each fix below | `frontend-next/test/showroom/*.test.tsx`, `test/tapTargets.test.ts`, `backend/__tests__/showroomInput.test.ts`, `backend/test/db/spotlight.db.test.js` |

Reference editors for the expected behaviour: Wix Studio, Squarespace,
Shopify theme editor, Webflow (published help pages): an always-visible
save status and explicit save, a disabled publish button while working, a
leave-page warning, searchable section library, inline field validation,
and no floating widgets over the editor.

## Results

| Scan | Before | After |
|---|---|---|
| Studio audit (axe serious/critical) | 11 | 0 |
| Studio audit (menus cut off) | 3 (Style menu at 390, 1024, 1440) | 0 |
| Studio audit (controls covered) | floating ? and AI buttons over fields and Save on phones/tablets | 0 |
| Controls scan (platform) | 652 (533 stretched, 47 misshapen, 72 small) | 0 |
| Spotlight run | Save button missing, title scrolled away | 21/21 checks pass |

Before/after screenshots: run the scripts with an output folder (they are
not committed; they contain local test data).

## Findings and fixes

Severity: **S1** blocks a task or loses work · **S2** wrong or confusing,
has a workaround · **S3** polish / accessibility below AA.

| # | Sev | Finding | Fix | Test |
|---|---|---|---|---|
| 1 | S1 | Feed Spotlight had no Save: changes auto-saved after 800 ms, owners could not tell if they were kept, and choices made before the site was first saved were lost | Explicit **Save** / **Cancel** in a fixed footer; Esc or ✕ with unsaved changes asks *Save / Discard / Keep editing*; without a saved site the choice is kept in Studio and sent with the next draft or publish (server create/update now accept `spotlight_mode` / `spotlight_section_ids`, same validator as the spotlight route) | `spotlightAndColours.test.tsx`, `showroomInput.test.ts`, `spotlight.db.test.js`, `spotlight-run.mjs` |
| 2 | S1 | Switches, pills and round buttons stretched into blobs on phones/tablets (global `min-height: 44px` on every button below 1024 px) | Rule removed; `.tap-target` adds an invisible ≥ 44 px hit area without changing the look; applied in Switch, Checkbox, Radio, small/icon Button, Slider | `tapTargets.test.ts`, `controls-scan.mjs` |
| 3 | S2 | Spotlight dialog: ticking sections scrolled the whole dialog, so the title and ✕ disappeared | Grid row locked to the dialog; only the list scrolls; header and Save bar always visible | `spotlight-run.mjs` ("title stays in view") |
| 4 | S2 | Floating Page guide and AI buttons covered form fields, the Save button and the tab bar on phones/tablets | Hidden in Studio below 1024 px and whenever a modal dialog is open; Studio's **More** menu offers *Page guide* and *Ask Nodbusiness AI* | `studioAudit.test.tsx`, `studio-audit.mjs` |
| 5 | S2 | Style menu ran off the bottom of the screen (colours, font, switches unreachable) | Menus scroll inside the height the screen has (`--radix-popover-content-available-height`) | `studioAudit.test.tsx`, `studio-audit.mjs` |
| 6 | S2 | Save status "Saved on this device" cut to "Saved o…" on phones; no visible way to save to the account (Ctrl+S only) | One status: *Saving… / Saved to your account / Saved on this device* (short words on phones); **Save draft** button in the top bar (in More on phones); Redo moved off the phone bar to give the name room | `studioAudit.test.tsx` |
| 7 | S2 | Publish could be pressed again while working; its label said "Publish site" while the button read "Publishing…" | Disabled with a spinner and `aria-busy`; reads *Publish*, *Update* (published site) or *Working…* | `studioAudit.test.tsx`, `studioDevices.test.tsx` |
| 8 | S2 | Closing the tab within 1.5 s of a change lost it (auto-save delay) | `beforeunload` confirmation while a change is pending | `studioAudit.test.tsx` |
| 9 | S2 | Wrong phone, email or link only failed on the server (or went live broken); no length limits shown | Field rules matching the server (`lib/builderFieldRules.ts`): phone/email/link keyboards, plain message under the field after leaving it, `https://` added to bare links, counters on the name (120) and description (1000); Publish stops and names the field | `builderFieldRules.test.tsx` |
| 10 | S2 | iOS Safari zoomed into every field on focus (14 px text) | Fields are 16 px on phones, 14 px from 640 px; 44 px tall | `builderFieldRules.test.tsx` (class), visual |
| 11 | S2 | Business list failed to load → Publish went ahead without knowing the owner's business | Toast with **Try again**; Publish reloads the list instead of guessing | `studioAudit.test.tsx` |
| 12 | S2 | "Add section" list (40+ items) had no search | Search box with "no match" help, searching names and purposes | `studioAudit.test.tsx` |
| 13 | S3 | Wizard steps on phones were unnamed buttons (✓ only) | `nav` "Steps", labels kept for screen readers, `aria-current="step"`, "(done)" | `studioAudit.test.tsx`, axe |
| 14 | S3 | Every slider was unnamed (name on the Radix root, not the `role="slider"` thumb) | Slider primitive passes the name to the thumb | `tapTargets.test.ts`, axe |
| 15 | S3 | Toast text (red/green/amber/blue) 3.1–4.4:1 on its tint — below AA, platform-wide | Darker toast text tokens (5.8–6.5:1) | `tapTargets.test.ts`, axe |
| 16 | S3 | Primary buttons faded on hover (`primary/90` = 4.36:1 white text), 54 files | New `primary-hover` token (#1d4ed8, 6.7:1); all 54 files use it | `tapTargets.test.ts`, axe |
| 17 | S3 | Several "Add photo" buttons in one form sounded identical to screen readers; upload progress was silent | Buttons named after their field ("Add photo: Cover photo"); upload announced | component tests |
| 18 | S3 | Preview re-rendered every section on every keystroke | Preview takes a deferred copy of the form and is memoised | existing Studio tests |
| 19 | S3 | "Feed Spotlight Preview" menu label (jargon, didn't match the dialog title) | "Feed Spotlight" | `studioAudit.test.tsx` |

Found earlier in the same PR (#230): spotlight dropped chosen sections and
ignored the owner's order; fixed colours only; hero button unreadable on
light colours; price "buttons" that did nothing; "Free" / "Included" items
orderable; a button nested inside a link; keyboard-inaccessible spotlight
tabs; unvalidated spotlight ids on the server.

## Not changed (recommendations for the owner)

- **Alt text for photos**: sections store a photo URL only. Adding an alt
  text field per photo needs a section data change (every section type and
  the public renderer); recommended as its own task.
- **Leaving Studio by the back arrow** does not ask, because the device copy
  is already saved (status line says so) and the draft reopens where the owner
  left it. Add a prompt only if owners report confusion.
- **Drag-and-drop reordering** of sections: Studio uses ↑ / ↓ buttons, which
  work by touch, keyboard and screen reader (WCAG 2.5.7). Drag could be added
  on desktop as an extra.

## How to re-run

From `frontend-next/` with the local stack up (`local-stack.sh up`,
`source ~/.nodbusiness-local/env.sh`):

```bash
node ../note/2026-11-14-showroom-audit/studio-audit.mjs /tmp/studio-audit
node ../note/2026-11-14-showroom-audit/controls-scan.mjs /tmp/controls-scan
node ../note/2026-11-14-showroom-audit/spotlight-run.mjs /tmp/spotlight-run
```

Each exits non-zero when it finds something.
