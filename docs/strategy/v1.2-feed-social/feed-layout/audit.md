# Feed Layout & Performance — Audit

## Current Architecture

- Backend: `GET /api/posts?limit=20&offset=0` — offset pagination
- Frontend: TanStack Query fetching posts
- Post card: `frontend-next/components/feed/PostCard.tsx`

## Issues with Offset Pagination

Offset pagination (`OFFSET 20`) has a critical flaw: if a new post is inserted while the user is scrolling, they see duplicate posts (the item at position 20 shifts to 21, so they see it twice) or skip posts. Global standard is **cursor-based pagination**.

```sql
-- Offset (current — bad for live feeds)
SELECT * FROM posts ORDER BY created_at DESC LIMIT 20 OFFSET 40;

-- Cursor (target — stable for live feeds)
SELECT * FROM posts WHERE created_at < $cursor ORDER BY created_at DESC LIMIT 20;
```

## Post Card Audit Checklist

| Element | Present | Standard |
|---------|---------|----------|
| Author avatar | ? | Circular, 40px, links to profile |
| Author name | ? | Bold, links to profile |
| Post timestamp | ? | Relative ("2 hours ago") with absolute on hover |
| Post content | ? | Max 4 lines with "See more" expand |
| Post image | ? | Aspect ratio preserved, lazy loaded |
| Like button + count | ? | Optimistic toggle, heart animation |
| Comment button + count | ? | Opens comment section inline |
| Share button | ? | Share sheet (copy link, WhatsApp, Telegram) |
| Save/bookmark button | ? | Optimistic toggle |
| 3-dot menu | ? | Edit (own posts), Delete (own), Report (others) |
| Hashtags clickable | ? | Each #tag links to `/hashtag/[tag]` |

## Performance Requirements

- Feed must use `useInfiniteQuery` (TanStack) for infinite scroll
- `IntersectionObserver` trigger at 80% scroll depth
- Each post card must be wrapped in `React.memo` to prevent re-renders
- Image must use Next.js `<Image>` with `loading="lazy"`
- Feed must show 5× `SkeletonPostCard` on initial load
