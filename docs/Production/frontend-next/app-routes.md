# frontend-next/app — Route Pages (grouped)

> Every URL in the product and the view component behind it. These page files are
> intentional 3–10 line wrappers (App Router requirement) — all logic lives in
> `views/` and `components/`, which have their own encyclopedia docs.

| Route | Delegates to | LOC | Source |
|---|---|---|---|
| `/` | `(inline)` | 10 | `app/(app)/page.tsx` |
| `/` | `(other)` | 19 | `app/page.tsx` |
| `/account` | `@/views/AccountSettings` | 9 | `app/(app)/account/page.tsx` |
| `/admin` | `@/views/Admin` | 5 | `app/(app)/admin/page.tsx` |
| `/admin/devops` | `@/views/DevOps` | 3 | `app/(app)/admin/devops/page.tsx` |
| `/analytics` | `@/views/BusinessAnalytics` | 13 | `app/(app)/analytics/page.tsx` |
| `/bookmarks` | `@/views/Bookmarks` | 5 | `app/(app)/bookmarks/page.tsx` |
| `/business/create` | `@/views/BusinessCreate` | 5 | `app/(app)/business/create/page.tsx` |
| `/business/edit` | `@/views/BusinessCreate` | 4 | `app/(app)/business/edit/page.tsx` |
| `/businesses` | `@/views/Businesses` | 3 | `app/(app)/businesses/page.tsx` |
| `/cart` | `@/views/Cart` | 5 | `app/(app)/cart/page.tsx` |
| `/choose-account` | `(inline)` | 83 | `app/choose-account/page.tsx` |
| `/coupons` | `@/views/CouponsManage` | 5 | `app/(app)/coupons/page.tsx` |
| `/courses` | `@/views/Courses` | 5 | `app/(app)/courses/page.tsx` |
| `/courses/[id]` | `@/views/CourseDetail` | 4 | `app/(app)/courses/[id]/page.tsx` |
| `/events` | `@/views/Events` | 5 | `app/(app)/events/page.tsx` |
| `/events/create` | `@/views/EventCreate` | 5 | `app/(app)/events/create/page.tsx` |
| `/explore` | `@/views/Explore` | 5 | `app/(app)/explore/page.tsx` |
| `/feed` | `(inline)` | 11 | `app/(app)/feed/page.tsx` |
| `/forgot-password` | `@/views/ForgotPassword` | 4 | `app/(auth)/forgot-password/page.tsx` |
| `/friends` | `@/views/Friends` | 3 | `app/(app)/friends/page.tsx` |
| `/hashtag/[name]` | `@/views/HashtagFeed` | 4 | `app/(app)/hashtag/[name]/page.tsx` |
| `/jobs` | `@/views/Jobs` | 5 | `app/(app)/jobs/page.tsx` |
| `/jobs/create` | `@/views/JobCreate` | 5 | `app/(app)/jobs/create/page.tsx` |
| `/landing` | `(inline)` | 296 | `app/landing/page.tsx` |
| `/login` | `@/views/Login` | 4 | `app/(auth)/login/page.tsx` |
| `/marketplace` | `@/views/Marketplace` | 5 | `app/(app)/marketplace/page.tsx` |
| `/messages` | `@/views/Messages` | 5 | `app/(app)/messages/page.tsx` |
| `/messages/[id]` | `@/views/ChatRoom` | 4 | `app/(app)/messages/[id]/page.tsx` |
| `/nearby` | `(inline)` | 6 | `app/(app)/nearby/page.tsx` |
| `/notifications` | `@/views/Notifications` | 5 | `app/(app)/notifications/page.tsx` |
| `/onboarding` | `@/views/Onboarding` | 4 | `app/(auth)/onboarding/page.tsx` |
| `/orders` | `@/views/Orders` | 5 | `app/(app)/orders/page.tsx` |
| `/orders/cancel` | `(inline)` | 42 | `app/(app)/orders/cancel/page.tsx` |
| `/orders/success` | `(inline)` | 132 | `app/(app)/orders/success/page.tsx` |
| `/p/[username]` | `@/views/Profile` | 13 | `app/p/[username]/page.tsx` |
| `/privacy` | `@/views/PrivacyAndSecurity` | 7 | `app/(app)/privacy/page.tsx` |
| `/products/[id]` | `@/views/ProductDetail` | 4 | `app/(app)/products/[id]/page.tsx` |
| `/products/create` | `@/views/ProductCreate` | 5 | `app/(app)/products/create/page.tsx` |
| `/products/edit` | `@/views/ProductCreate` | 4 | `app/(app)/products/edit/page.tsx` |
| `/profile` | `@/views/Profile` | 13 | `app/(app)/profile/page.tsx` |
| `/profile/[id]` | `@/views/Profile` | 13 | `app/(app)/profile/[id]/page.tsx` |
| `/profile/edit` | `@/views/ProfileEdit` | 5 | `app/(app)/profile/edit/page.tsx` |
| `/referral` | `@/views/Referral` | 5 | `app/(app)/referral/page.tsx` |
| `/register` | `@/views/Register` | 13 | `app/(auth)/register/page.tsx` |
| `/reset-password` | `@/views/ResetPassword` | 13 | `app/(auth)/reset-password/page.tsx` |
| `/search` | `@/views/Search` | 13 | `app/(app)/search/page.tsx` |
| `/service-agreement` | `@/views/ServiceAgreement` | 12 | `app/(app)/service-agreement/page.tsx` |
| `/settings` | `(inline)` | 8 | `app/(app)/settings/page.tsx` |
| `/showroom/[slug]` | `@/views/ShowroomView` | 17 | `app/showroom/[slug]/page.tsx` |
| `/showroom/create` | `@/views/ShowroomWizard` | 12 | `app/(app)/showroom/create/page.tsx` |
| `/showroom/samples` | `(inline)` | 30 | `app/(app)/showroom/samples/page.tsx` |
| `/showroom/templates` | `(inline)` | 30 | `app/(app)/showroom/templates/page.tsx` |
| `/showrooms` | `@/views/Showrooms` | 5 | `app/(app)/showrooms/page.tsx` |
| `/showrooms/[id]` | `@/views/ShowroomView` | 17 | `app/showrooms/[id]/page.tsx` |
| `/tasks` | `@/views/Tasks` | 5 | `app/(app)/tasks/page.tsx` |
| `/tasks/calendar` | `@/views/TaskCalendar` | 5 | `app/(app)/tasks/calendar/page.tsx` |
| `/tasks/create` | `@/views/TaskCreate` | 5 | `app/(app)/tasks/create/page.tsx` |
| `/wallet` | `@/views/Wallet` | 5 | `app/(app)/wallet/page.tsx` |

## Special files
- `app/layout.tsx` — root HTML shell + providers (I18next → Theme → Auth → Cart → QueryClient)
- `app/providers.tsx` — provider composition
- `app/error.tsx` / `app/global-error.tsx` — root error boundaries (public routes)
- `(app)/error.tsx`, `(auth)/error.tsx` — segment boundaries reporting via GlobalErrorReporter
- `app/not-found.tsx` — 404 page
