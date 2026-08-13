# v1.7 — Discover

> **Theme:** Content Discovery
> **Goal:** Users can find anything — people, products, businesses, tasks, jobs — in under 10 seconds. The explore and search experience surfaces the right content at the right time.

---

## Scope

| Section | File |
|---------|------|
| Global search | [audit.md](./global-search/audit.md) · [tasks.md](./global-search/tasks.md) |
| Explore / trending | [audit.md](./explore-trending/audit.md) · [tasks.md](./explore-trending/tasks.md) |
| Nearby map | [audit.md](./nearby-map/audit.md) · [tasks.md](./nearby-map/tasks.md) |
| People suggestions | [audit.md](./people-suggestions/audit.md) · [tasks.md](./people-suggestions/tasks.md) |
| Hashtag pages | [audit.md](./hashtag-pages/audit.md) · [tasks.md](./hashtag-pages/tasks.md) |
| Category browsing | [audit.md](./category-browsing/audit.md) · [tasks.md](./category-browsing/tasks.md) |

---

## Success Criteria

- [ ] Search returns results in < 800ms
- [ ] Search covers: users, products, showrooms, posts, tasks, jobs, events, hashtags
- [ ] Search shows instant suggestions as user types (debounced, 300ms)
- [ ] Recent searches saved locally, clearable
- [ ] Trending section: top hashtags, trending posts, popular showrooms, open tasks
- [ ] Trending data refreshed every 5 minutes (Redis cache)
- [ ] Nearby map: shows products, businesses, and tasks within chosen radius
- [ ] Map clusters pins at zoom-out, expands at zoom-in
- [ ] Tapping a pin shows profile peek modal without leaving the map
- [ ] People suggestions: "People you may know" based on mutual follows, location
- [ ] Dismissed suggestions never reappear
- [ ] Hashtag page: all posts with that tag, sorted by recency + engagement
- [ ] Category pages: products filtered by category with sort options

---

## Dependencies

- Backend: search, trending, suggestions, maps, hashtags routes (all exist)
- Backend: Redis cache for trending (exists)
- Frontend: Leaflet map (exists), search debounce, suggestion dropdown
