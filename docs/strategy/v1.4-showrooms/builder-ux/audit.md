# Showroom Builder UX — Audit

## Current Architecture

- Route: `/showroom/[id]/edit` or `/showrooms/builder`
- Backend: `PUT /api/showrooms/:id { sections, title, ... }`
- Sections stored as JSON string in `showrooms.sections`
- 25+ section types defined in `frontend-next/components/showroom/builderSections.ts`

## Builder UX Requirements (Global Standard — No-Code Builder)

The showroom builder must feel like Notion or Webflow Lite — simple enough for a shop owner with no tech background.

### Left Panel (Section Library)
- List of all available section types grouped by category
- Each section: icon + name + brief description
- Click to add to showroom

### Center Panel (Live Preview)
- Shows exactly how the showroom looks to visitors
- Updates **instantly** as user makes changes (no save required to preview)
- Mobile / Desktop toggle button to preview both layouts
- Sections reorderable via drag-and-drop (desktop) or Up/Down buttons (mobile)

### Right Panel (Section Editor)
- Clicking any section in the preview opens its editor in the right panel
- Each section type has appropriate fields:
  - Hero: title, subtitle, background color/image, CTA text + link
  - About: text editor (rich text)
  - Items/Menu: add/remove/edit items (name, price, description, image)
  - Contact: phone, email, address, map pin, social links
  - Gallery: image upload grid
  - Testimonials: add/remove quotes
  - FAQ: add/remove Q&A pairs

### Top Bar
- Showroom name (editable inline)
- "Save" button (saves draft)
- "Publish" / "Unpublish" toggle
- "Preview" button (opens public URL in new tab)
- "Share" button (copies public URL)

## Issues to Investigate

- [ ] Does the builder have live preview?
- [ ] Is drag-and-drop section reordering implemented?
- [ ] Does each section type have its own editor fields?
- [ ] Is the builder mobile-usable?
- [ ] How long does "Save" take? Should be < 1s
