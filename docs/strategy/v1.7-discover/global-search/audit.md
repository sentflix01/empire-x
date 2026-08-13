# Global Search — Audit

## Current Architecture

- Backend: `GET /api/search?q=xxx` — full-text PostgreSQL search
- Returns: `{ users[], products[], showrooms[], posts[] }`
- Frontend: `/search` page

## Global Standard Search UX

### Phase 1 — Search Input
```
User types → debounce 300ms → show instant suggestions dropdown
```

Suggestions dropdown shows:
- Recent searches (localStorage, max 5)
- Popular searches (from trending)
- Quick results: first 3 matching users + first 3 matching products

### Phase 2 — Results Page
```
User hits Enter / clicks result → full results page with tabs
```

Results tabs:
- All (mixed)
- People
- Products
- Showrooms
- Posts
- Tasks
- Jobs
- Events
- Hashtags (#)

### Quality Requirements

| Requirement | Standard |
|-------------|----------|
| Response time | < 800ms |
| Typo tolerance | "iphone" matches "iPhone" |
| Empty results | `<EmptyState>` with suggestions |
| No results | "No results for X. Try: [popular searches]" |
| Result count | "47 results for 'coffee'" |
| Highlighted matches | Query term **bold** in results |
| Recent searches | Saved to localStorage, shown as chips |
| Clear history | "Clear recent searches" button |

## Issues to Investigate

- [ ] Does the search have instant suggestions while typing?
- [ ] Does it cover all 8+ entity types with tabs?
- [ ] Is there highlighted match text in results?
- [ ] Are recent searches saved and shown?
- [ ] Does search work on mobile keyboard (dismiss keyboard on submit)?
