# Halehame — Mobile Strategy

> How Halehame reaches mobile users in Ethiopia — PWA today, native apps tomorrow.
> **Last updated:** August 2026

---

## Current State: Progressive Web App (PWA)

Halehame is currently a **PWA** — a web app that behaves like a native app on mobile.

### What Works Today
- **Install to home screen** — users see an Halehame icon, no App Store needed
- **Push notifications** — works on Android Chrome; limited on iOS Safari
- **Offline indicator** — service worker installed (`public/sw.js`)
- **Fast loading** — Next.js static generation + Vercel Edge CDN
- **Responsive UI** — all views designed mobile-first

### PWA Limitations
| Limitation | Impact | Workaround |
|---|---|---|
| iOS push notifications | No push on iPhone (Safari < iOS 16.4) | Use in-app notifications via socket |
| App Store discovery | Not in App Store = harder to discover | Google Play Store (TWA) — see below |
| Background sync | Limited support | BullMQ for server-side retries |
| Camera access | Works but UX inferior to native | `getUserMedia()` works for posts |
| Biometric auth | Not available via PWA | WebAuthn API (planned) |

---

## Phase 1: PWA + Trusted Web Activity (Android)

**Trusted Web Activity (TWA)** wraps the PWA in a thin Android shell and publishes to Google Play Store.

### Why TWA First
- Reuses 100% of existing frontend code
- Gets Halehame into Google Play Store (important for discovery in Ethiopia)
- Android dominates Ethiopian smartphone market (85%+ market share)
- Takes 1–2 weeks to implement

### Implementation Steps
```bash
# Install Bubblewrap CLI
npm install -g @bubblewrap/cli

# Initialize TWA project
bubblewrap init --manifest https://halehame.vercel.app/manifest.json

# Build APK
bubblewrap build

# Sign and upload to Google Play
# Need: Google Play Developer account ($25 one-time fee)
```

### Requirements for TWA
- `manifest.json` already exists ✅
- HTTPS everywhere ✅
- PWA icons in all sizes (72, 96, 128, 144, 152, 192, 384, 512px) — check current icons
- `assetlinks.json` file at `/.well-known/assetlinks.json` linking domain to app

---

## Phase 2: React Native App (6–12 months)

### Why React Native
- Share ~60% of business logic with the web app (API calls, data models, utilities)
- Strong Ethiopian developer community familiar with JavaScript/TypeScript
- Expo managed workflow = faster development
- True native push notifications on iOS

### Architecture for React Native

```
Shared Code (TypeScript)
├── /api/         ← Already exists, reuse as-is
├── /lib/         ← Auth, socket, push — reuse
├── /store/       ← Zustand slices — reuse 100%
└── /types/       ← TypeScript types — reuse 100%

Web-only Code
└── /components/  ← Tailwind components (web)
    /views/       ← Next.js pages

Native-only Code (new)
├── /screens/     ← React Native screens
├── /components/  ← React Native components (StyleSheet)
└── /navigation/  ← React Navigation setup
```

### Key Features to Prioritize in Native App
1. Push notifications (true background push, not dependent on browser)
2. Camera integration (direct from phone camera for product photos)
3. Biometric login (Face ID / Touch ID)
4. Better offline mode with AsyncStorage
5. App Store optimization (screenshots, localisation)

---

## Phase 3: iOS App (12–18 months)

iOS App Store requires:
- Apple Developer Account ($99/year)
- Xcode + macOS for building
- App Store review process (7–14 days per release)
- Privacy manifest (required since iOS 17)

Ethiopian iPhone market share: ~15% and growing. Worth the investment at scale.

---

## Push Notification Strategy by Platform

| Platform | Method | Current Status |
|---|---|---|
| Android Chrome (PWA) | Web Push API | ✅ Working |
| Android App (TWA) | Web Push API | ✅ Same as PWA |
| Android App (React Native) | Firebase Cloud Messaging (FCM) | ❌ Not built |
| iOS Safari (PWA, iOS 16.4+) | Web Push API | ⚠️ Limited |
| iOS App (React Native) | Apple Push Notification Service (APNs) | ❌ Not built |

### Migration to FCM/APNs (When React Native is built)

```javascript
// backend/routes/push.js
// Current: web-push VAPID
// Future: firebase-admin for FCM

const admin = require('firebase-admin');

async function sendPushToUser(userId, title, body, url) {
  // Get user's device tokens from DB
  const { rows } = await pool.query(
    'SELECT token, platform FROM push_subscriptions WHERE user_id = $1',
    [userId]
  );
  
  for (const { token, platform } of rows) {
    if (platform === 'web') {
      await sendWebPush(token, title, body, url); // existing
    } else if (platform === 'android' || platform === 'ios') {
      await admin.messaging().send({
        token,
        notification: { title, body },
        data: { url },
        android: { priority: 'high' },
        apns: { payload: { aps: { sound: 'default' } } }
      });
    }
  }
}
```

---

## Mobile UX Standards

### Touch Targets
- Minimum 44×44px for all tappable elements
- Current violations: some icon-only buttons are 32×32 — fix in accessibility audit

### Bottom Navigation (Mobile)
Current mobile bottom bar tabs:
1. More (menu)
2. Explore
3. **Messages** (with unread badge) ← added August 2026
4. Friends
5. Home

### Swipe Gestures (Planned)
- Swipe right on a chat to reply
- Swipe left on an order to see options
- Pull-to-refresh on feed

### Safe Area Handling
```tsx
// Already implemented in ChatRoom.tsx:
style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
// Apply this pattern to all bottom-fixed UI elements
```

---

## App Store Optimisation (ASO)

### Google Play Store Listing
- **App name:** Halehame — Ethiopian Superapp
- **Short description:** Social, marketplace & business tools for Ethiopia
- **Category:** Social / Business
- **Keywords:** Ethiopian marketplace, Amharic social media, business app Ethiopia, Chapa payment, Telebirr

### Screenshots Required (Play Store)
- Feed with posts (social feature)
- Marketplace with products
- Showroom Studio (business builder)
- Chat room
- Order management
- Wallet with Chapa/Stripe

### Ratings Strategy
- Prompt for rating after: first completed order, 5th session, first message sent
- Use in-app rating prompt (Google Play In-App Review API)
- Respond to every Play Store review within 48 hours

---

## Offline Mode Plan

What should work without internet:
- Read cached feed posts (last 50)
- Read cached chat messages (last 100 per conversation)
- View your own products
- Draft a post (save to IndexedDB, send when online)
- View your orders

Implementation:
```javascript
// Service worker cache strategy
// frontend-next/public/sw.js — currently minimal
// Add:
// - Cache feed API responses (stale-while-revalidate)
// - Cache product images (cache-first)
// - Cache user profile (stale-while-revalidate)
// - Queue failed mutations (background sync)
```
