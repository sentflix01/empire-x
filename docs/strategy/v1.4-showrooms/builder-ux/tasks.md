# Showroom Builder UX — Tasks

## Status: 🔴 Not Started

---

## Step 1 — Audit Existing Builder

- [ ] Read `frontend-next/app/(app)/showroom/` directory fully
- [ ] Read `frontend-next/components/showroom/` directory fully
- [ ] Identify: what exists, what is missing vs. the audit requirements
- [ ] Map existing section types to their editor components

---

## Step 2 — Live Preview

- [ ] Builder state held in React state (not yet saved to server)
- [ ] Preview panel re-renders on every state change
- [ ] "Auto-save" debounced — save to server 2s after last change
- [ ] Visual indicator: "Saving..." → "Saved ✓" in top bar
- [ ] If save fails: "Save failed — retry" with retry button

---

## Step 3 — Section Reordering

- [ ] Desktop: install `@dnd-kit/core` + `@dnd-kit/sortable` (if not installed)
  - Drag handle icon on each section in preview
  - Dragging reorders sections array in state → auto-saves
- [ ] Mobile: Up ▲ / Down ▼ icon buttons on each section (simpler, works on touch)

---

## Step 4 — Section Add / Remove

- [ ] "Add Section" button opens a modal/panel with all available section types
- [ ] Section types grouped: Content / Products / Contact / Media / Social
- [ ] Click to insert section at bottom (or after current selected section)
- [ ] Remove section: × button on each section, confirm dialog
- [ ] Max sections: 20 (show warning if approaching limit)

---

## Step 5 — Section Editors

Ensure each section type has complete editor fields:

- [ ] `hero` — title, subtitle, CTA text, CTA link, background color picker
- [ ] `about` — textarea with basic formatting
- [ ] `items` / `menu` — dynamic list: add item (name, price, description, image upload), remove, reorder
- [ ] `services` — same as items but with different field labels
- [ ] `contact` — phone, email, address, WhatsApp, Telegram, website
- [ ] `gallery` — multi-image upload grid (max 12 images)
- [ ] `testimonials` — dynamic list: name, quote, role/company, avatar upload
- [ ] `faq` — dynamic list: question + answer pairs
- [ ] `pricing` — pricing plan cards: name, price, features list
- [ ] `social` — social media links: Instagram, TikTok, Facebook, Twitter, Telegram, YouTube
- [ ] `hours` — day-by-day open/close time picker
- [ ] `map` — Google Maps embed or lat/lon picker
- [ ] `video` — YouTube/Vimeo URL embed

---

## Step 6 — Publish Flow

- [ ] "Publish" button:
  - If `status === 'draft'` → `PUT /api/showrooms/:id { status: 'published' }`
  - Show success toast: "Your showroom is live! [View it →]"
  - Copy URL to clipboard option
- [ ] "Unpublish" button when already published
- [ ] Published indicator in top bar: green dot "Live" / gray dot "Draft"

---

## Step 7 — Mobile Builder UX

- [ ] On mobile, builder becomes single-column: section list → tap → edit panel
- [ ] No split-panel layout on < 768px
- [ ] Preview button opens full-screen preview modal
- [ ] All editors must work on mobile keyboard (no hover-only interactions)

---

## Step 8 — Verify

- [ ] Add a section → preview updates instantly
- [ ] Edit a section field → preview updates instantly
- [ ] Reorder sections → order persists after save
- [ ] Publish → public URL shows updated showroom
- [ ] Auto-save works: change something, close tab, reopen — changes preserved
- [ ] Works correctly on 375px mobile screen
