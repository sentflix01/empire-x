# PWA Manifest & Install — Tasks

## Status: 🔴 Not Started

---

## Step 1 — Create PWA Icons

- [ ] Create/export the following icon files in `frontend-next/public/icons/`:
  - `icon-192.png` — 192×192px, standard icon
  - `icon-512.png` — 512×512px, standard icon
  - `icon-512-maskable.png` — 512×512px, maskable (safe zone: center 80%)
  - `apple-touch-icon.png` — 180×180px for iOS
  - `favicon-32.png` — 32×32px
  - `favicon-16.png` — 16×16px
- [ ] All icons use the Nodbusiness brand (logo on primary blue background)
- [ ] Test maskable icon at [maskable.app](https://maskable.app)

---

## Step 2 — Create manifest.json

- [ ] Create `frontend-next/public/manifest.json` with full spec from audit.md
- [ ] `start_url`: `/feed` (sends logged-in users to feed when opening from home screen)
- [ ] `display`: `standalone`
- [ ] `theme_color`: `#2563eb` (primary blue)
- [ ] `background_color`: `#0f172a` (dark — matches splash screen)

---

## Step 3 — Link in layout.tsx

- [ ] In `frontend-next/app/layout.tsx`:
  ```tsx
  export const metadata = {
    manifest: '/manifest.json',
    themeColor: '#2563eb',
    appleWebApp: {
      capable: true,
      statusBarStyle: 'black-translucent',
      title: 'Nodbusiness',
    },
  };
  ```
- [ ] Add `<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">` to `<head>`

---

## Step 4 — Service Worker (Offline Support)

- [ ] Install `next-pwa`:
  ```bash
  cd frontend-next && npm install next-pwa
  ```
- [ ] Configure in `next.config.ts`:
  ```ts
  const withPWA = require('next-pwa')({
    dest: 'public',
    disable: process.env.NODE_ENV === 'development',
    register: true,
    skipWaiting: true,
    runtimeCaching: [...] // cache strategies per route type
  });
  ```
- [ ] Cache strategies:
  - Static assets (JS/CSS/images): `CacheFirst`, 30-day TTL
  - API responses (`/api/posts`, `/api/products`): `NetworkFirst`, 5-min TTL
  - Pages: `NetworkFirst`
- [ ] Create `frontend-next/public/offline.html` — custom offline page
  - Shows Nodbusiness logo + "You're offline. Reconnect to continue."
  - Links to last cached pages

---

## Step 5 — Install Prompt

- [ ] Create `frontend-next/hooks/usePWAInstall.ts`
  - Captures `beforeinstallprompt` event
  - Exposes `canInstall: boolean` and `promptInstall: () => void`
- [ ] Show "Install Nodbusiness App" banner after user's 2nd session:
  - Bottom banner: [Nodbusiness icon] "Add to home screen for the best experience" [Install] [×]
  - Dismissable — stores dismissal in localStorage for 7 days
- [ ] "Install App" option in Settings page

---

## Step 6 — Splash Screens (iOS)

- [ ] Generate splash screens for common iOS sizes:
  - 1242×2688 (iPhone XS Max)
  - 1125×2436 (iPhone X/11 Pro)
  - 750×1334 (iPhone 8)
- [ ] Use: dark background (#0f172a) + centered Nodbusiness logo
- [ ] Add `<link rel="apple-touch-startup-image">` tags for each size

---

## Step 7 — Verify

- [ ] Chrome DevTools → Application → Manifest: all fields correct
- [ ] Chrome DevTools → Application → Service Workers: registered and active
- [ ] Lighthouse PWA audit: passes all checks
- [ ] Android: "Add to Home Screen" prompt appears after 2nd visit
- [ ] iOS Safari: "Add to Home Screen" → opens in standalone mode
- [ ] Go offline → app shows offline page instead of browser error
- [ ] Previously visited pages load from cache while offline
