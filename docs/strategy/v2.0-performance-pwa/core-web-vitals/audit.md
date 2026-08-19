# Core Web Vitals — Audit

## Metrics to Measure

Run Lighthouse in Chrome DevTools (Mobile, Slow 4G simulation) on these pages:

| Page | LCP Target | INP Target | CLS Target |
|------|-----------|-----------|-----------|
| `/feed` | < 2.5s | < 200ms | < 0.1 |
| `/marketplace` | < 2.5s | < 200ms | < 0.1 |
| `/showroom/[slug]` | < 2.0s | < 200ms | < 0.1 |
| `/profile/[id]` | < 2.5s | < 200ms | < 0.1 |
| Landing page | < 1.5s | < 200ms | 0 |

## Common CWV Issues in Next.js Apps

### LCP (Largest Contentful Paint) — what makes it slow
- Images not using `<Image>` component (no size optimization)
- No `priority` prop on above-the-fold images
- Large JavaScript bundles blocking render
- No server-side rendering (waterfall API calls on client)
- Fonts loaded without `next/font`

### INP (Interaction to Next Paint) — what causes jank
- Heavy event handlers on click/tap
- Synchronous state updates causing large re-renders
- Large component trees re-rendering on every interaction
- Missing `React.memo` on expensive components
- Leaflet and Recharts loading on every page (not code-split)

### CLS (Cumulative Layout Shift) — what causes shifts
- Images without `width` and `height` props
- Dynamic content inserted above existing content
- Fonts causing layout shift (FOUT)
- Skeleton loaders that don't match real content dimensions
- Ads or embeds without reserved space

## Measurement Commands
```bash
# Run Lighthouse programmatically
npx lighthouse https://nodbusiness.vercel.app/feed \
  --preset=perf --emulated-form-factor=mobile \
  --output=json --output-path=lighthouse-feed.json

# Check bundle sizes
cd frontend-next && npm run build
# Look at .next/analyze/ output
```
