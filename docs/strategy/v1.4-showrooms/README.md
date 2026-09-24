# v1.4 — Showrooms

> **Theme:** Business Identity
> **Goal:** Every business owner can build a professional-looking mini-website (showroom) in under 10 minutes, without any technical knowledge. Public showroom pages are SEO-indexed and load in under 2 seconds.

---

## Scope

| Section | File |
|---------|------|
| Showroom builder UX | [audit.md](./builder-ux/audit.md) · [tasks.md](./builder-ux/tasks.md) |
| Section types & templates | [audit.md](./section-types/audit.md) · [tasks.md](./section-types/tasks.md) |
| Public showroom page | [audit.md](./public-page/audit.md) · [tasks.md](./public-page/tasks.md) |
| SEO & sharing | [audit.md](./seo-sharing/audit.md) · [tasks.md](./seo-sharing/tasks.md) |
| External data sources | [audit.md](./external-sources/audit.md) · [tasks.md](./external-sources/tasks.md) |
| Showroom analytics | [audit.md](./analytics/audit.md) · [tasks.md](./analytics/tasks.md) |

---

## Success Criteria

- [ ] Builder has live preview — changes visible instantly without save
- [ ] Drag-and-drop section reordering works on desktop AND a simple up/down on mobile
- [ ] All 25+ section types render correctly across devices
- [ ] Custom slug URL works: `nodbusiness.app/showroom/my-business`
- [ ] Public showroom page loads in < 2s (Next.js SSR or ISR)
- [ ] Open Graph image generated automatically for each showroom
- [ ] Share button generates correct preview on WhatsApp, Telegram, Twitter
- [ ] Showroom view count increments correctly (no double-count on refresh)
- [ ] External API sources pull and display data with correct field mapping
- [ ] Showroom analytics: daily views, top sections, visitor referrers

---

## Dependencies

- Backend: showrooms, externalSources routes (exist)
- Frontend: builder drag-and-drop (DnD Kit), section components
- SEO: Next.js `generateMetadata` on public showroom pages
