# v2.0 — Performance & PWA

> **Theme:** Speed & Installability
> **Goal:** Nodbusiness loads fast on any connection, scores green on Core Web Vitals, and can be installed on Android and iOS as a native-feeling app.

---

## Why This Version

Ethiopian mobile users are often on slower connections (3G/4G). A 1-second delay in load time reduces conversions by 7%. A slow app that looks polished is still a bad app. Performance is a feature.

PWA gives users an app icon on their home screen, offline access, and push notifications — without requiring App Store or Play Store submission.

---

## Scope

| Section | File |
|---------|------|
| Core Web Vitals | [audit.md](./core-web-vitals/audit.md) · [tasks.md](./core-web-vitals/tasks.md) |
| Image optimization | [audit.md](./image-optimization/audit.md) · [tasks.md](./image-optimization/tasks.md) |
| Code splitting & bundles | [audit.md](./code-splitting/audit.md) · [tasks.md](./code-splitting/tasks.md) |
| PWA manifest & install | [audit.md](./pwa-manifest/audit.md) · [tasks.md](./pwa-manifest/tasks.md) |
| Service worker & offline | [audit.md](./service-worker/audit.md) · [tasks.md](./service-worker/tasks.md) |
| API response caching | [audit.md](./api-caching/audit.md) · [tasks.md](./api-caching/tasks.md) |

---

## Success Criteria

**Core Web Vitals (measured on mobile, slow 4G)**
- [ ] LCP (Largest Contentful Paint) < 2.5s on feed, marketplace, showroom pages
- [ ] INP (Interaction to Next Paint) < 200ms on all interactive elements
- [ ] CLS (Cumulative Layout Shift) < 0.1 on all pages
- [ ] TTFB (Time to First Byte) < 800ms

**Images**
- [ ] All images served as WebP via Next.js `<Image>` component
- [ ] All images lazy-loaded except above-the-fold
- [ ] Blur placeholder shown while image loads
- [ ] User-uploaded images compressed on upload (< 1MB for feed, < 2MB for cover)

**PWA**
- [ ] `manifest.json` with correct icons (192px, 512px), colors, name
- [ ] "Add to Home Screen" prompt appears after 2nd visit
- [ ] App opens in standalone mode (no browser chrome)
- [ ] Splash screen on launch
- [ ] Offline page shown when app has no connection and cache miss
- [ ] Push notifications work when app is closed (existing VAPID setup)

**Bundle**
- [ ] No page bundle > 200KB (gzipped)
- [ ] Heavy libraries (Leaflet, Recharts) lazy-loaded only on pages that use them
- [ ] No unused CSS in production build

---

## Dependencies

- Frontend: Next.js Image, dynamic imports, next-pwa or custom SW
- Backend: Cache-Control headers, ETag (already implemented)
- Infrastructure: Vercel edge network (handles CDN globally)
