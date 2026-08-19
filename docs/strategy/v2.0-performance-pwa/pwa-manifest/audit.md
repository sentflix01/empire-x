# PWA Manifest & Install — Audit

## What Makes a Good PWA

A Progressive Web App gives users a native-app-like experience:
- Installable to home screen (Android and iOS)
- Standalone mode (no browser chrome when opened from home screen)
- Custom splash screen
- Works offline (at least shows cached pages)
- Push notifications work when app is closed

## Current State Check

- [ ] Does `frontend-next/public/manifest.json` exist?
- [ ] Is it linked in `app/layout.tsx`?
- [ ] Are PWA icons available in `public/icons/`? (192px + 512px minimum)
- [ ] Is there a service worker registered?
- [ ] Does the app pass Chrome's "Installable" PWA audit?

## manifest.json Requirements

```json
{
  "name": "Nodbusiness",
  "short_name": "Nodbusiness",
  "description": "Ethiopian superapp — social, marketplace, tasks, and more",
  "start_url": "/feed",
  "display": "standalone",
  "background_color": "#0f172a",
  "theme_color": "#2563eb",
  "orientation": "portrait",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-512-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ],
  "screenshots": [
    { "src": "/screenshots/feed.png", "sizes": "390x844", "type": "image/png", "form_factor": "narrow" }
  ]
}
```

## iOS-Specific Requirements (Safari)
```html
<!-- In <head> -->
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Nodbusiness">
<link rel="apple-touch-icon" href="/icons/icon-192.png">
<link rel="apple-touch-startup-image" href="/splash/splash-1242x2688.png">
```
