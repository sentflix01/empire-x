# v1.0 — Foundation

> **Theme:** Skeleton Quality
> **Goal:** Every page in the app handles all three non-happy states correctly — loading, empty, and error — at every screen size.
>
> This is the most important version. It turns a working app into a trustworthy app.

---

## Why This First

A user who sees a blank screen, an unhandled error, or a broken layout on mobile will not return. Before adding any new feature, the foundation must be solid. Global-standard apps handle every state intentionally.

---

## Scope

| Section | File |
|---------|------|
| Loading states (skeletons) | [audit.md](./loading-states/audit.md) · [tasks.md](./loading-states/tasks.md) |
| Empty states | [audit.md](./empty-states/audit.md) · [tasks.md](./empty-states/tasks.md) |
| Error states | [audit.md](./error-states/audit.md) · [tasks.md](./error-states/tasks.md) |
| Mobile responsiveness | [audit.md](./mobile-responsive/audit.md) · [tasks.md](./mobile-responsive/tasks.md) |
| Typography & spacing | [audit.md](./typography-spacing/audit.md) · [tasks.md](./typography-spacing/tasks.md) |

---

## Success Criteria

- [ ] Every page that fetches data shows a skeleton while loading
- [ ] Every list page has an empty state with an illustration, message, and CTA
- [ ] Every API error shows a friendly message with a retry button
- [ ] Every page is usable and beautiful at 375px (iPhone SE) width
- [ ] No horizontal scroll on any page at any screen size
- [ ] No layout shift (CLS = 0) on initial load of any major page
- [ ] All font sizes readable (minimum 14px body, 16px inputs)

---

## Dependencies

None — this version has zero new backend requirements.

---

## Estimated Effort

Medium — 3–5 days of focused frontend work.
