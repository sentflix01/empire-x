# Typography & Spacing — Tasks

## Status: 🔴 Not Started

---

## Step 1 — Enforce Input Font Size (iOS Zoom Fix)

- [ ] Find every `<input>`, `<textarea>`, `<select>` in the codebase
- [ ] Ensure all have `text-base` (16px) or `text-[16px]` — prevents iOS auto-zoom on focus
- [ ] Use: `grep -r "<input" frontend-next/components --include="*.tsx"`

---

## Step 2 — Heading Hierarchy Per Page

Each page must have one and only one visual H1, with H2/H3 used consistently below it:

- [ ] Page titles: `text-2xl font-bold` (24px)
- [ ] Section headings: `text-lg font-semibold` (18px)
- [ ] Card titles: `text-base font-medium` (16px)
- [ ] Supporting text: `text-sm text-muted-foreground` (14px)
- [ ] Fine print / timestamps: `text-xs text-muted-foreground` (12px)

---

## Step 3 — Card Padding Standardization

Pick one and apply consistently:
- [ ] Standard card: `p-4` (16px) — list items, compact cards
- [ ] Comfortable card: `p-5` or `p-6` (20–24px) — detail cards, featured sections
- [ ] Audit all card components and normalize

---

## Step 4 — Line Height & Readability

- [ ] Body paragraphs: `leading-relaxed` (1.625)
- [ ] Card descriptions: `leading-relaxed`
- [ ] Single-line labels: `leading-none` or `leading-tight`
- [ ] Long-form content (about sections, course descriptions): `leading-7`

---

## Step 5 — Text Truncation

- [ ] All list item titles truncated at 1 line: `truncate`
- [ ] All descriptions truncated at 2 lines: `line-clamp-2`
- [ ] All truncated text has `title={fullText}` attribute for hover tooltip

---

## Step 6 — Verify Visual Rhythm

Walk through the main pages and verify:
- [ ] Feed: consistent post card layout, clear author name vs. content hierarchy
- [ ] Marketplace: consistent product card layout
- [ ] Profile: clear name → headline → bio hierarchy
- [ ] Messages: sender name vs. message content visually distinct
