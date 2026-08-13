# v1.2 — Feed & Social

> **Theme:** Core Loop
> **Goal:** The social feed is engaging, fast, and encourages daily return. Every social action (like, comment, share, follow) feels responsive and satisfying.

---

## The Core Loop

Post → Get likes/comments → Follow others → See their posts → Repeat

This loop is the engine of every successful social app. Everything in this version makes the loop tighter and more rewarding.

---

## Scope

| Section | File |
|---------|------|
| Feed layout & performance | [audit.md](./feed-layout/audit.md) · [tasks.md](./feed-layout/tasks.md) |
| Post composer | [audit.md](./post-composer/audit.md) · [tasks.md](./post-composer/tasks.md) |
| Post interactions (like, comment, share, save) | [audit.md](./post-interactions/audit.md) · [tasks.md](./post-interactions/tasks.md) |
| Stories | [audit.md](./stories/audit.md) · [tasks.md](./stories/tasks.md) |
| Hashtags & trending | [audit.md](./hashtags-trending/audit.md) · [tasks.md](./hashtags-trending/tasks.md) |
| Follow system | [audit.md](./follow-system/audit.md) · [tasks.md](./follow-system/tasks.md) |
| Polls | [audit.md](./polls/audit.md) · [tasks.md](./polls/tasks.md) |

---

## Success Criteria

- [ ] Feed loads in under 1 second on 4G connection
- [ ] Infinite scroll works without duplicate posts or skipped items
- [ ] Like/unlike is instant (optimistic update — no waiting for server)
- [ ] Comment count updates in real-time via WebSocket
- [ ] Post composer supports text, image upload, and hashtags
- [ ] Stories bar shows unseen stories first, seen stories dimmed
- [ ] Story viewer auto-advances, has progress bar, supports swipe
- [ ] Hashtag pages show all posts for that tag, sorted by recency
- [ ] Follow/unfollow is instant (optimistic update)
- [ ] Polls show live vote counts, user can only vote once

---

## Dependencies

- Backend: feed, posts, likes, comments, follows, stories routes (all exist)
- Backend: WebSocket events for real-time like/comment counts (may need addition)
- Frontend: optimistic updates in TanStack Query mutations
