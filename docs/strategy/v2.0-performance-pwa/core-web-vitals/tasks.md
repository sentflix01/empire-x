# Core Web Vitals — Tasks

## Status: 🔴 Not Started

---

## Step 1 — Measure Baseline

- [ ] Run Lighthouse on `/feed`, `/marketplace`, `/showroom/[slug]` in Chrome DevTools
- [ ] Record baseline scores in a table
- [ ] Identify the top 3 issues per page
- [ ] Use Chrome DevTools → Performance tab to identify specific bottlenecks

---

## Step 2 — Fix LCP

- [ ] Audit: find the LCP element on each key page (usually hero image or first post image)
- [ ] Add `priority` prop to above-the-fold `<Image>` components:
  ```tsx
  <Image src={url} priority width={800} height={400} alt="..." />
  ```
- [ ] Convert all `<img>` tags to `<Image>` from `next/image`
- [ ] Add explicit `width` + `height` to all `<Image>` components (prevents CLS too)
- [ ] Install `@next/font` and load Inter through it (eliminates font FOUT):
  ```ts
  import { Inter } from 'next/font/google';
  const inter = Inter({ subsets: ['latin'], display: 'swap' });
  ```
- [ ] Ensure key pages use SSR/ISR (not client-side fetch) for initial data

---

## Step 3 — Fix CLS

- [ ] All `<Image>` components have explicit `width` + `height` or use `fill` with sized container
- [ ] Skeleton loaders match exact dimensions of real content
- [ ] Avatar images: always render with `width={40} height={40}` even when loading
- [ ] Reserve space for dynamic content (notifications badge, balance):
  ```css
  min-height: 24px; /* Reserve space before data loads */
  ```
- [ ] No content inserted above existing content during load

---

## Step 4 — Fix INP (Reduce Jank)

- [ ] Wrap all list item components in `React.memo`:
  - PostCard, ProductCard, TaskCard, JobCard, CourseCard, EventCard
- [ ] Lazy-load heavy libraries:
  ```ts
  // Leaflet — only load on /nearby and map pages
  const MapComponent = dynamic(() => import('@/components/Map'), { ssr: false });
  
  // Recharts — only load on /analytics and /admin
  const AreaChart = dynamic(() => import('recharts').then(m => m.AreaChart));
  ```
- [ ] Split route-level code: each page should only load its own components
- [ ] Avoid large `useEffect` arrays that trigger unnecessary re-renders

---

## Step 5 — Bundle Size Audit

- [ ] Add bundle analyzer to `next.config.ts`:
  ```ts
  const withBundleAnalyzer = require('@next/bundle-analyzer')({
    enabled: process.env.ANALYZE === 'true'
  });
  ```
- [ ] Run: `ANALYZE=true npm run build`
- [ ] Identify any package > 50KB that can be replaced or lazy-loaded
- [ ] Common offenders to check: `moment.js` (replace with `date-fns`), `lodash` (use individual imports)

---

## Step 6 — Verify

- [ ] Run Lighthouse again after changes
- [ ] LCP < 2.5s on feed, marketplace, showroom pages
- [ ] CLS = 0 on all key pages
- [ ] No page bundle > 200KB gzipped
- [ ] Leaflet only loads on map pages (verify in Network tab)
- [ ] Recharts only loads on analytics pages
