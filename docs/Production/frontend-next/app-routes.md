# frontend-next/app — Route Pages (grouped)

## 1. What is this?

**Next.js App Router page inventory.** Each row is generated from a current `page.tsx` file; route groups such as `(app)` and `(auth)` are omitted from the URL.

## 2. Why does it exist?

This inventory documents the routes currently present in `frontend-next/app`. Deferred areas (Mewacho, Tasks, Courses, Jobs, and Events) have no active page routes; see `docs/product/POST_LAUNCH_FEATURES.md`.

## 3. What does it do?

| Route | Page entry | LOC | Source |
|---|---|---:|---|
| `/account` | `AccountSettings` | 9 | `app/(app)/account/page.tsx` |
| `/admin/devops` | `DevOps` | 3 | `app/(app)/admin/devops/page.tsx` |
| `/admin` | `Admin` | 5 | `app/(app)/admin/page.tsx` |
| `/analytics` | `BusinessAnalytics` | 13 | `app/(app)/analytics/page.tsx` |
| `/auth/google/callback` | `page entry` | 84 | `app/(auth)/auth/google/callback/page.tsx` |
| `/bookmarks` | `Bookmarks` | 5 | `app/(app)/bookmarks/page.tsx` |
| `/business/create` | `BusinessCreate` | 5 | `app/(app)/business/create/page.tsx` |
| `/business/edit` | `BusinessCreate` | 4 | `app/(app)/business/edit/page.tsx` |
| `/business/inventory` | `BusinessInventory` | 3 | `app/(app)/business/inventory/page.tsx` |
| `/business/subscription` | `BusinessSubscription` | 3 | `app/(app)/business/subscription/page.tsx` |
| `/businesses` | `Businesses` | 3 | `app/(app)/businesses/page.tsx` |
| `/cart` | `Cart` | 5 | `app/(app)/cart/page.tsx` |
| `/choose-account` | `page entry` | 83 | `app/choose-account/page.tsx` |
| `/choose-mode` | `page entry` | 22 | `app/choose-mode/page.tsx` |
| `/coupons` | `CouponsManage` | 5 | `app/(app)/coupons/page.tsx` |
| `/explore` | `Explore` | 5 | `app/(app)/explore/page.tsx` |
| `/feed` | `map/DynamicMap` | 11 | `app/(app)/feed/page.tsx` |
| `/forgot-password` | `ForgotPassword` | 12 | `app/(auth)/forgot-password/page.tsx` |
| `/friends` | `Friends` | 3 | `app/(app)/friends/page.tsx` |
| `/hashtag/[name]` | `HashtagFeed` | 4 | `app/(app)/hashtag/[name]/page.tsx` |
| `/landing` | `landing/LandingControls` | 313 | `app/landing/page.tsx` |
| `/login` | `Login` | 4 | `app/(auth)/login/page.tsx` |
| `/marketplace` | `Marketplace` | 5 | `app/(app)/marketplace/page.tsx` |
| `/messages/[id]` | `ChatRoom` | 4 | `app/(app)/messages/[id]/page.tsx` |
| `/messages` | `Messages` | 5 | `app/(app)/messages/page.tsx` |
| `/nearby` | `map/DynamicMap` | 6 | `app/(app)/nearby/page.tsx` |
| `/notifications` | `Notifications` | 5 | `app/(app)/notifications/page.tsx` |
| `/onboarding` | `Onboarding` | 4 | `app/(auth)/onboarding/page.tsx` |
| `/orders/cancel` | `ui/button` | 42 | `app/(app)/orders/cancel/page.tsx` |
| `/orders/success` | `ui/button` | 130 | `app/(app)/orders/success/page.tsx` |
| `/orders` | `Orders` | 5 | `app/(app)/orders/page.tsx` |
| `/p/[username]` | `Profile` | 13 | `app/p/[username]/page.tsx` |
| `/` | `page entry (auth redirect)` | 19 | `app/page.tsx` |
| `/privacy` | `PrivacyAndSecurity` | 7 | `app/(app)/privacy/page.tsx` |
| `/products/[id]` | `ProductDetail` | 4 | `app/(app)/products/[id]/page.tsx` |
| `/products/create` | `ProductCreate` | 5 | `app/(app)/products/create/page.tsx` |
| `/products/edit` | `ProductCreate` | 4 | `app/(app)/products/edit/page.tsx` |
| `/profile/[id]` | `Profile` | 13 | `app/(app)/profile/[id]/page.tsx` |
| `/profile/edit` | `ProfileEdit` | 5 | `app/(app)/profile/edit/page.tsx` |
| `/profile` | `Profile` | 13 | `app/(app)/profile/page.tsx` |
| `/referral` | `Referral` | 5 | `app/(app)/referral/page.tsx` |
| `/register` | `Register` | 13 | `app/(auth)/register/page.tsx` |
| `/reset-password` | `ResetPassword` | 13 | `app/(auth)/reset-password/page.tsx` |
| `/scorecard` | `Scorecard` | 3 | `app/(app)/scorecard/page.tsx` |
| `/search` | `Search` | 13 | `app/(app)/search/page.tsx` |
| `/service-agreement` | `ServiceAgreement` | 18 | `app/service-agreement/page.tsx` |
| `/settings` | `page entry` | 8 | `app/(app)/settings/page.tsx` |
| `/showroom/[slug]` | `ShowroomView` | 17 | `app/showroom/[slug]/page.tsx` |
| `/showroom/create` | `ShowroomWizard` | 12 | `app/(app)/showroom/create/page.tsx` |
| `/showroom/samples` | `page entry` | 30 | `app/(app)/showroom/samples/page.tsx` |
| `/showroom/templates` | `page entry` | 30 | `app/(app)/showroom/templates/page.tsx` |
| `/showrooms/[id]` | `ShowroomView` | 17 | `app/showrooms/[id]/page.tsx` |
| `/showrooms` | `Showrooms` | 5 | `app/(app)/showrooms/page.tsx` |
| `/wallet` | `Wallet` | 5 | `app/(app)/wallet/page.tsx` |

## Special files
- `app/layout.tsx` — root HTML shell + providers (I18next → Theme → Auth → Cart → QueryClient)
- `app/providers.tsx` — provider composition
- `app/error.tsx` / `app/global-error.tsx` — root error boundaries (public routes)
- `(app)/error.tsx`, `(auth)/error.tsx` — segment boundaries reporting via GlobalErrorReporter
- `app/not-found.tsx` — 404 page

## 4. What does it touch?

**Files referenced:**
- `app/page.tsx`
- `app/choose-account/page.tsx`
- `app/landing/page.tsx`
- `app/layout.tsx`
- `app/providers.tsx`
- `app/error.tsx`
- `app/global-error.tsx`
- `app/not-found.tsx`
