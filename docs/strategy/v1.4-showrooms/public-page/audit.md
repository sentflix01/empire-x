# Public Showroom Page — Audit

## Route
`/showroom/[slug]` — publicly accessible, no auth required

## Current Architecture
- Backend: `GET /api/showrooms/:slug` by slug
- Sections: JSON string parsed client-side
- Status: only `published` showrooms visible publicly

## Global Standard Public Page Requirements

| Element | Standard |
|---------|----------|
| Hero section | Cover image, logo, business name, tagline, CTA button |
| Navigation | Sticky section jump nav ("Menu", "About", "Contact") |
| Section rendering | All 25+ section types render correctly |
| Contact section | Click-to-call phone, mailto email, WhatsApp button |
| Share button | Copy link, WhatsApp, Telegram |
| View count | Increment on every unique visit |
| Mobile layout | Single column, large touch targets |
| Loading | SSR or ISR — no client-side flash |
| SEO | `<title>`, `<meta description>`, Open Graph image |
| 404 handling | Unpublished/missing slug → friendly 404 page |

## Performance Requirement
Public showroom pages are the most shareable part of the app.
They MUST load in < 2 seconds even on slow connections.
This requires **Next.js SSR or ISR** (not client-side fetch).

## SEO Requirements
```html
<title>Kategna Kitchen Bole — Halehame Showroom</title>
<meta name="description" content="Kategna Kitchen Bole is a restaurant in Bole, Addis Ababa...">
<meta property="og:title" content="Kategna Kitchen Bole">
<meta property="og:description" content="...">
<meta property="og:image" content="[cover_image_url]">
<meta property="og:url" content="https://halehame.vercel.app/showroom/kategna-kitchen-bole">
<meta name="twitter:card" content="summary_large_image">
```

## Issues to Investigate
- [ ] Is the public page using SSR/ISR or client-side fetch?
- [ ] Does `generateMetadata` exist for SEO?
- [ ] Does view count increment on visit?
- [ ] Are contact buttons (call, WhatsApp) working?
- [ ] Does the page handle unpublished slugs with a 404?
- [ ] Is there a sticky section navigation on long showrooms?
