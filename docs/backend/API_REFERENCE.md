# Nodbusiness — API Reference

> **AUTO-GENERATED** from the route sources by `backend/scripts/generate-api-docs.js`.
> Do not hand-edit. After any route change run `npm run docs:api` (in `backend/`)
> and commit the regenerated file in the same PR.
> Endpoints: **255** across **44** mounted modules · Generated: 2026-08-23

| Legend | Meaning |
|---|---|
| 🔒 auth | Valid access token required (`requireAuth`) |
| 👑 admin | Admin role required (`requireAuth` + `requireAdmin`) |
| ⚪ optional | Token personalizes the response when present |
| 🌐 public | No token required |

Standard error shape: `{ "error": string, "code": string, "request_id"?: string }`
with `422 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`, `500 INTERNAL_ERROR`. Every response also carries `API-Version: 1`.

## Contents
- [`admin`](#admin) (18)
- [`ai`](#ai) (3)
- [`auth`](#auth) (12)
- [`businesses`](#businesses) (5)
- [`cart`](#cart) (5)
- [`commission`](#commission) (2)
- [`coupons`](#coupons) (6)
- [`courses`](#courses) (8)
- [`delivery`](#delivery) (2)
- [`devops`](#devops) (9)
- [`docs`](#docs) (1)
- [`events`](#events) (7)
- [`externalSources`](#externalsources) (9)
- [`flags`](#flags) (3)
- [`friends`](#friends) (1)
- [`hashtags`](#hashtags) (3)
- [`jobs`](#jobs) (8)
- [`maps`](#maps) (1)
- [`messages`](#messages) (22)
- [`moderation`](#moderation) (3)
- [`notifications`](#notifications) (6)
- [`orders`](#orders) (11)
- [`polls`](#polls) (2)
- [`posts`](#posts) (10)
- [`products`](#products) (5)
- [`profiles`](#profiles) (11)
- [`proxy`](#proxy) (1)
- [`push`](#push) (3)
- [`referral`](#referral) (2)
- [`returns`](#returns) (5)
- [`reviews`](#reviews) (4)
- [`saves`](#saves) (3)
- [`search`](#search) (1)
- [`showrooms`](#showrooms) (6)
- [`stories`](#stories) (8)
- [`suggestions`](#suggestions) (2)
- [`tasks`](#tasks) (8)
- [`telegram`](#telegram) (4)
- [`trending`](#trending) (2)
- [`upload`](#upload) (1)
- [`variants`](#variants) (4)
- [`verification`](#verification) (5)
- [`wallet`](#wallet) (9)
- [`wishlists`](#wishlists) (14)


## admin — admin

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/admin/stats` | 🌐 public | routes/admin.ts:11 |
| `GET` | `/api/admin/users` | 🌐 public | routes/admin.ts:41 |
| `PUT` | `/api/admin/users/:id/role` | 🌐 public | routes/admin.ts:54 |
| `DELETE` | `/api/admin/users/:id` | 🌐 public | routes/admin.ts:64 |
| `POST` | `/api/admin/users/:id/ban` | 🌐 public | routes/admin.ts:73 |
| `POST` | `/api/admin/users/:id/unban` | 🌐 public | routes/admin.ts:87 |
| `GET` | `/api/admin/verifications` | 🌐 public | routes/admin.ts:100 |
| `POST` | `/api/admin/verifications/:userId` | 🌐 public | routes/admin.ts:115 |
| `DELETE` | `/api/admin/verifications/:userId` | 🌐 public | routes/admin.ts:134 |
| `GET` | `/api/admin/posts` | 🌐 public | routes/admin.ts:146 |
| `DELETE` | `/api/admin/posts/:id` | 🌐 public | routes/admin.ts:154 |
| `GET` | `/api/admin/products` | 🌐 public | routes/admin.ts:167 |
| `DELETE` | `/api/admin/products/:id` | 🌐 public | routes/admin.ts:175 |
| `GET` | `/api/admin/orders` | 🌐 public | routes/admin.ts:181 |
| `GET` | `/api/admin/reports` | 🌐 public | routes/admin.ts:190 |
| `PUT` | `/api/admin/reports/:id` | 🌐 public | routes/admin.ts:199 |
| `PUT` | `/api/admin/users/:id/verify` | 🌐 public | routes/admin.ts:207 |
| `GET` | `/api/admin/stats/revenue` | 🌐 public | routes/admin.ts:215 |

## ai — ai

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/ai/status` | 🌐 public | routes/ai.ts:11 |
| `POST` | `/api/ai/generate` | 🔒 auth | routes/ai.ts:15 |
| `POST` | `/api/ai/chat` | 🔒 auth | routes/ai.ts:31 |

## auth — Authentication endpoints

| Method | Path | Auth | Source |
|---|---|---|---|
| `POST` | `/api/auth/register` | 🌐 public | routes/auth.ts:133 |
| `POST` | `/api/auth/verify-otp` | 🌐 public | routes/auth.ts:209 |
| `POST` | `/api/auth/resend-otp` | 🌐 public | routes/auth.ts:256 |
| `POST` | `/api/auth/login` | 🌐 public | routes/auth.ts:299 |
| `POST` | `/api/auth/google` | 🌐 public | routes/auth.ts:369 |
| `GET` | `/api/auth/me` | 🔒 auth | routes/auth.ts:440 |
| `POST` | `/api/auth/forgot-password` | 🌐 public | routes/auth.ts:474 |
| `POST` | `/api/auth/reset-password` | 🌐 public | routes/auth.ts:509 |
| `PUT` | `/api/auth/change-password` | 🔒 auth | routes/auth.ts:548 |
| `POST` | `/api/auth/refresh` | 🌐 public | routes/auth.ts:582 |
| `POST` | `/api/auth/logout` | 🌐 public | routes/auth.ts:623 |
| `POST` | `/api/auth/logout-all` | 🔒 auth | routes/auth.ts:641 |

## businesses — businesses

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/businesses/` | ⚪ optional | routes/businesses.ts:10 |
| `GET` | `/api/businesses/:id` | ⚪ optional | routes/businesses.ts:19 |
| `POST` | `/api/businesses/` | 🔒 auth | routes/businesses.ts:27 |
| `PUT` | `/api/businesses/:id` | 🔒 auth | routes/businesses.ts:41 |
| `DELETE` | `/api/businesses/:id` | 🔒 auth | routes/businesses.ts:50 |

## cart — cart

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/cart/` | 🔒 auth | routes/cart.ts:9 |
| `POST` | `/api/cart/add` | 🔒 auth | routes/cart.ts:21 |
| `PUT` | `/api/cart/:itemId` | 🔒 auth | routes/cart.ts:42 |
| `DELETE` | `/api/cart/:itemId` | 🔒 auth | routes/cart.ts:55 |
| `DELETE` | `/api/cart/` | 🔒 auth | routes/cart.ts:62 |

## commission — Platform commission tracking

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/commission/my-commissions` | 🔒 auth | routes/commission.ts:44 |
| `GET` | `/api/commission/admin/summary` | 👑 admin | routes/commission.ts:55 |

## coupons — coupons

| Method | Path | Auth | Source |
|---|---|---|---|
| `POST` | `/api/coupons/` | 🔒 auth | routes/coupons.ts:8 |
| `GET` | `/api/coupons/mine` | 🔒 auth | routes/coupons.ts:25 |
| `POST` | `/api/coupons/validate` | 🌐 public | routes/coupons.ts:32 |
| `POST` | `/api/coupons/use` | 🔒 auth | routes/coupons.ts:52 |
| `PATCH` | `/api/coupons/:id/toggle` | 🔒 auth | routes/coupons.ts:60 |
| `DELETE` | `/api/coupons/:id` | 🔒 auth | routes/coupons.ts:70 |

## courses — courses

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/courses/` | ⚪ optional | routes/courses.ts:9 |
| `GET` | `/api/courses/:id` | ⚪ optional | routes/courses.ts:18 |
| `POST` | `/api/courses/` | 🔒 auth | routes/courses.ts:27 |
| `PUT` | `/api/courses/:id` | 🔒 auth | routes/courses.ts:35 |
| `POST` | `/api/courses/:id/lessons` | 🔒 auth | routes/courses.ts:44 |
| `POST` | `/api/courses/:id/enroll` | 🔒 auth | routes/courses.ts:59 |
| `GET` | `/api/courses/:id/enrolled` | 🔒 auth | routes/courses.ts:72 |
| `PUT` | `/api/courses/:id/progress` | 🔒 auth | routes/courses.ts:79 |

## delivery — delivery

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/delivery/order/:orderId` | ⚪ optional | routes/delivery.ts:9 |
| `POST` | `/api/delivery/` | 🔒 auth | routes/delivery.ts:19 |

## devops — devops

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/devops/` | 👑 admin | routes/devops.ts:11 |
| `POST` | `/api/devops/` | 👑 admin | routes/devops.ts:18 |
| `PUT` | `/api/devops/:id` | 👑 admin | routes/devops.ts:35 |
| `DELETE` | `/api/devops/:id` | 👑 admin | routes/devops.ts:54 |
| `GET` | `/api/devops/errors` | 👑 admin | routes/devops.ts:63 |
| `PUT` | `/api/devops/errors/:id/resolve` | 👑 admin | routes/devops.ts:78 |
| `POST` | `/api/devops/errors/report` | ⚪ optional | routes/devops.ts:91 |
| `GET` | `/api/devops/versions` | 🌐 public | routes/devops.ts:106 |
| `PUT` | `/api/devops/versions` | 👑 admin | routes/devops.ts:113 |

## docs — docs

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/docs/` | 🌐 public | routes/docs.ts:6 |

## events — events

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/events/` | ⚪ optional | routes/events.ts:9 |
| `GET` | `/api/events/:id` | ⚪ optional | routes/events.ts:16 |
| `POST` | `/api/events/` | 🔒 auth | routes/events.ts:24 |
| `PUT` | `/api/events/:id` | 🔒 auth | routes/events.ts:32 |
| `DELETE` | `/api/events/:id` | 🔒 auth | routes/events.ts:41 |
| `POST` | `/api/events/:id/book` | 🔒 auth | routes/events.ts:51 |
| `GET` | `/api/events/:id/attendees` | ⚪ optional | routes/events.ts:69 |

## externalSources — External Data Sources

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/showrooms/:showroomId/external-sources/health` | 🌐 public | routes/externalSources.ts:89 |
| `GET` | `/api/showrooms/:showroomId/external-sources/` | 🌐 public | routes/externalSources.ts:113 |
| `POST` | `/api/showrooms/:showroomId/external-sources/` | 🌐 public | routes/externalSources.ts:125 |
| `PUT` | `/api/showrooms/:showroomId/external-sources/:sourceId` | 🌐 public | routes/externalSources.ts:148 |
| `DELETE` | `/api/showrooms/:showroomId/external-sources/:sourceId` | 🌐 public | routes/externalSources.ts:173 |
| `GET` | `/api/showrooms/:showroomId/external-sources/:sourceId/mappings` | 🌐 public | routes/externalSources.ts:188 |
| `POST` | `/api/showrooms/:showroomId/external-sources/:sourceId/mappings` | 🌐 public | routes/externalSources.ts:198 |
| `DELETE` | `/api/showrooms/:showroomId/external-sources/:sourceId/mappings/:mappingId` | 🌐 public | routes/externalSources.ts:213 |
| `POST` | `/api/showrooms/:showroomId/external-sources/:sourceId/refresh` | 🌐 public | routes/externalSources.ts:225 |

## flags — flags

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/flags/` | 🔒 auth | routes/flags.ts:8 |
| `GET` | `/api/flags/:name` | 🔒 auth | routes/flags.ts:22 |
| `PUT` | `/api/flags/:name` | 👑 admin | routes/flags.ts:29 |

## friends — friends

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/friends/mutual` | 🔒 auth | routes/friends.ts:8 |

## hashtags — hashtags

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/hashtags/trending` | 🌐 public | routes/hashtags.ts:23 |
| `GET` | `/api/hashtags/:name` | ⚪ optional | routes/hashtags.ts:32 |
| `GET` | `/api/hashtags/:name/posts` | ⚪ optional | routes/hashtags.ts:45 |

## jobs — jobs

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/jobs/` | ⚪ optional | routes/jobs.ts:9 |
| `GET` | `/api/jobs/:id` | ⚪ optional | routes/jobs.ts:20 |
| `POST` | `/api/jobs/` | 🔒 auth | routes/jobs.ts:28 |
| `PUT` | `/api/jobs/:id` | 🔒 auth | routes/jobs.ts:36 |
| `DELETE` | `/api/jobs/:id` | 🔒 auth | routes/jobs.ts:45 |
| `POST` | `/api/jobs/:id/apply` | 🔒 auth | routes/jobs.ts:55 |
| `GET` | `/api/jobs/:id/applications` | 🔒 auth | routes/jobs.ts:70 |
| `PUT` | `/api/jobs/applications/:id` | 🔒 auth | routes/jobs.ts:83 |

## maps — maps

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/maps/nearby` | ⚪ optional | routes/maps.ts:25 |

## messages — Conversations and real-time messaging

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/messages/conversations` | 🔒 auth | routes/messages.ts:80 |
| `GET` | `/api/messages/conversations/:id` | 🔒 auth | routes/messages.ts:105 |
| `POST` | `/api/messages/conversations/find-or-create` | 🔒 auth | routes/messages.ts:114 |
| `POST` | `/api/messages/conversations` | 🔒 auth | routes/messages.ts:149 |
| `PUT` | `/api/messages/conversations/:id` | 🔒 auth | routes/messages.ts:171 |
| `GET` | `/api/messages/conversations/:convId/messages` | 🔒 auth | routes/messages.ts:182 |
| `POST` | `/api/messages/conversations/:convId/messages` | 🔒 auth | routes/messages.ts:195 |
| `PUT` | `/api/messages/messages/:id` | 🔒 auth | routes/messages.ts:249 |
| `DELETE` | `/api/messages/messages/:id` | 🔒 auth | routes/messages.ts:262 |
| `DELETE` | `/api/messages/conversations/:id/history` | 🔒 auth | routes/messages.ts:273 |
| `POST` | `/api/messages/conversations/:id/leave` | 🔒 auth | routes/messages.ts:281 |
| `POST` | `/api/messages/conversations/:id/members` | 🔒 auth | routes/messages.ts:293 |
| `DELETE` | `/api/messages/conversations/:id/members/:userId` | 🔒 auth | routes/messages.ts:308 |
| `DELETE` | `/api/messages/conversations/:id` | 🔒 auth | routes/messages.ts:321 |
| `PUT` | `/api/messages/presence` | 🔒 auth | routes/messages.ts:334 |
| `GET` | `/api/messages/presence/:userId` | 🔒 auth | routes/messages.ts:347 |
| `PUT` | `/api/messages/presence/settings` | 🔒 auth | routes/messages.ts:362 |
| `POST` | `/api/messages/block/:targetId` | 🔒 auth | routes/messages.ts:371 |
| `DELETE` | `/api/messages/block/:targetId` | 🔒 auth | routes/messages.ts:377 |
| `GET` | `/api/messages/block/:targetId` | 🔒 auth | routes/messages.ts:382 |
| `POST` | `/api/messages/messages/:id/forward` | 🔒 auth | routes/messages.ts:389 |
| `POST` | `/api/messages/inquiry` | 🔒 auth | routes/messages.ts:408 |

## moderation — moderation

| Method | Path | Auth | Source |
|---|---|---|---|
| `POST` | `/api/moderation/report` | 🔒 auth | routes/moderation.ts:8 |
| `GET` | `/api/moderation/reports` | 👑 admin | routes/moderation.ts:26 |
| `PUT` | `/api/moderation/reports/:id` | 👑 admin | routes/moderation.ts:42 |

## notifications — notifications

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/notifications/` | 🔒 auth | routes/notifications.ts:12 |
| `POST` | `/api/notifications/` | 🔒 auth | routes/notifications.ts:73 |
| `PUT` | `/api/notifications/read-all` | 🔒 auth | routes/notifications.ts:84 |
| `POST` | `/api/notifications/mark-read` | 🔒 auth | routes/notifications.ts:91 |
| `PUT` | `/api/notifications/:id/read` | 🔒 auth | routes/notifications.ts:106 |
| `DELETE` | `/api/notifications/:id` | 🔒 auth | routes/notifications.ts:117 |

## orders — Orders, Stripe + Chapa payments, webhooks

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/orders/` | 🔒 auth | routes/orders.ts:59 |
| `GET` | `/api/orders/session/:sessionId` | 🔒 auth | routes/orders.ts:88 |
| `GET` | `/api/orders/:id` | 🔒 auth | routes/orders.ts:96 |
| `POST` | `/api/orders/` | 🔒 auth | routes/orders.ts:134 |
| `PUT` | `/api/orders/:id` | 🔒 auth | routes/orders.ts:162 |
| `POST` | `/api/orders/checkout/session` | 🔒 auth | routes/orders.ts:211 |
| `POST` | `/api/orders/webhook` | 🌐 public | routes/orders.ts:376 |
| `POST` | `/api/orders/checkout/chapa` | 🔒 auth | routes/orders.ts:406 |
| `GET` | `/api/orders/chapa/sandbox` | 🌐 public | routes/orders.ts:439 |
| `GET` | `/api/orders/chapa/status/:tx_ref` | 🌐 public | routes/orders.ts:451 |
| `GET` | `/api/orders/chapa/verify/:tx_ref` | 🌐 public | routes/orders.ts:462 |

## polls — polls

| Method | Path | Auth | Source |
|---|---|---|---|
| `POST` | `/api/polls/:postId/vote` | 🔒 auth | routes/polls.ts:8 |
| `GET` | `/api/polls/:postId/results` | ⚪ optional | routes/polls.ts:43 |

## posts — Social feed posts

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/posts/` | ⚪ optional | routes/posts.ts:26 |
| `GET` | `/api/posts/:id` | ⚪ optional | routes/posts.ts:88 |
| `POST` | `/api/posts/` | 🔒 auth | routes/posts.ts:96 |
| `PUT` | `/api/posts/:id` | 🔒 auth | routes/posts.ts:125 |
| `DELETE` | `/api/posts/:id` | 🔒 auth | routes/posts.ts:134 |
| `GET` | `/api/posts/:id/like` | ⚪ optional | routes/posts.ts:146 |
| `POST` | `/api/posts/:id/like` | 🔒 auth | routes/posts.ts:154 |
| `GET` | `/api/posts/:id/comments` | ⚪ optional | routes/posts.ts:184 |
| `POST` | `/api/posts/:id/comments` | 🔒 auth | routes/posts.ts:196 |
| `DELETE` | `/api/posts/:postId/comments/:commentId` | 🔒 auth | routes/posts.ts:248 |

## products — Marketplace products

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/products/` | ⚪ optional | routes/products.ts:31 |
| `GET` | `/api/products/:id` | ⚪ optional | routes/products.ts:64 |
| `POST` | `/api/products/` | 🔒 auth | routes/products.ts:73 |
| `PUT` | `/api/products/:id` | 🔒 auth | routes/products.ts:86 |
| `DELETE` | `/api/products/:id` | 🔒 auth | routes/products.ts:146 |

## profiles — profiles

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/profiles/me` | 🔒 auth | routes/profiles.ts:30 |
| `GET` | `/api/profiles/by-user/:userId` | ⚪ optional | routes/profiles.ts:38 |
| `GET` | `/api/profiles/me/follows` | 🔒 auth | routes/profiles.ts:49 |
| `GET` | `/api/profiles/follows` | 🔒 auth | routes/profiles.ts:56 |
| `GET` | `/api/profiles/:id` | ⚪ optional | routes/profiles.ts:63 |
| `GET` | `/api/profiles/` | ⚪ optional | routes/profiles.ts:74 |
| `POST` | `/api/profiles/` | 🔒 auth | routes/profiles.ts:106 |
| `PUT` | `/api/profiles/me/upsert` | 🔒 auth | routes/profiles.ts:119 |
| `PUT` | `/api/profiles/:id` | 🔒 auth | routes/profiles.ts:137 |
| `PATCH` | `/api/profiles/me/ticker` | 🔒 auth | routes/profiles.ts:151 |
| `POST` | `/api/profiles/follow/:targetUserId` | 🔒 auth | routes/profiles.ts:177 |

## proxy — Public Proxy Route

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/proxy/:showroomId/:sectionKey` | 🌐 public | routes/proxy.ts:16 |

## push — push

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/push/vapid-public-key` | 🌐 public | routes/push.ts:52 |
| `POST` | `/api/push/subscribe` | 🔒 auth | routes/push.ts:57 |
| `DELETE` | `/api/push/unsubscribe` | 🔒 auth | routes/push.ts:72 |

## referral — referral

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/referral/my-code` | 🔒 auth | routes/referral.ts:8 |
| `POST` | `/api/referral/use` | 🌐 public | routes/referral.ts:27 |

## returns — returns

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/returns/` | 🔒 auth | routes/returns.ts:10 |
| `GET` | `/api/returns/seller` | 🔒 auth | routes/returns.ts:21 |
| `POST` | `/api/returns/` | 🔒 auth | routes/returns.ts:33 |
| `PUT` | `/api/returns/:id/approve` | 🔒 auth | routes/returns.ts:58 |
| `PUT` | `/api/returns/:id/reject` | 🔒 auth | routes/returns.ts:78 |

## reviews — reviews

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/reviews/` | ⚪ optional | routes/reviews.ts:9 |
| `GET` | `/api/reviews/product/:productId` | ⚪ optional | routes/reviews.ts:29 |
| `POST` | `/api/reviews/` | 🔒 auth | routes/reviews.ts:39 |
| `DELETE` | `/api/reviews/:id` | 🔒 auth | routes/reviews.ts:61 |

## saves — saves

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/saves/` | 🔒 auth | routes/saves.ts:8 |
| `POST` | `/api/saves/toggle` | 🔒 auth | routes/saves.ts:20 |
| `GET` | `/api/saves/check/:targetId` | 🔒 auth | routes/saves.ts:34 |

## search — Cross-entity full-text search

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/search/` | ⚪ optional | routes/search.ts:45 |

## showrooms — showrooms

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/showrooms/` | ⚪ optional | routes/showrooms.ts:11 |
| `GET` | `/api/showrooms/slug/:slug` | ⚪ optional | routes/showrooms.ts:22 |
| `GET` | `/api/showrooms/:id` | ⚪ optional | routes/showrooms.ts:31 |
| `POST` | `/api/showrooms/` | 🔒 auth | routes/showrooms.ts:39 |
| `PUT` | `/api/showrooms/:id` | 🔒 auth | routes/showrooms.ts:55 |
| `DELETE` | `/api/showrooms/:id` | 🔒 auth | routes/showrooms.ts:64 |

## stories — stories

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/stories/` | ⚪ optional | routes/stories.ts:15 |
| `GET` | `/api/stories/user/:userId` | ⚪ optional | routes/stories.ts:28 |
| `POST` | `/api/stories/` | 🔒 auth | routes/stories.ts:40 |
| `POST` | `/api/stories/:id/view` | 🔒 auth | routes/stories.ts:52 |
| `POST` | `/api/stories/:id/reactions` | 🔒 auth | routes/stories.ts:60 |
| `GET` | `/api/stories/:id/comments` | 🔒 auth | routes/stories.ts:75 |
| `POST` | `/api/stories/:id/comments` | 🔒 auth | routes/stories.ts:82 |
| `DELETE` | `/api/stories/:id` | 🔒 auth | routes/stories.ts:100 |

## suggestions — suggestions

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/suggestions/people` | 🔒 auth | routes/suggestions.ts:9 |
| `POST` | `/api/suggestions/dismiss/:targetUserId` | 🔒 auth | routes/suggestions.ts:73 |

## tasks — tasks

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/tasks/` | ⚪ optional | routes/tasks.ts:54 |
| `GET` | `/api/tasks/:id` | ⚪ optional | routes/tasks.ts:65 |
| `POST` | `/api/tasks/` | 🔒 auth | routes/tasks.ts:73 |
| `PUT` | `/api/tasks/bids/:bidId` | 🔒 auth | routes/tasks.ts:88 |
| `PUT` | `/api/tasks/:id` | 🔒 auth | routes/tasks.ts:100 |
| `DELETE` | `/api/tasks/:id` | 🔒 auth | routes/tasks.ts:109 |
| `GET` | `/api/tasks/:taskId/bids` | ⚪ optional | routes/tasks.ts:119 |
| `POST` | `/api/tasks/:taskId/bids` | 🔒 auth | routes/tasks.ts:126 |

## telegram — telegram

| Method | Path | Auth | Source |
|---|---|---|---|
| `POST` | `/api/telegram/connect` | 🔒 auth | routes/telegram.ts:29 |
| `POST` | `/api/telegram/disconnect` | 🔒 auth | routes/telegram.ts:38 |
| `GET` | `/api/telegram/status` | 🔒 auth | routes/telegram.ts:45 |
| `POST` | `/api/telegram/test` | 🔒 auth | routes/telegram.ts:52 |

## trending — trending

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/trending/` | ⚪ optional | routes/trending.ts:10 |
| `GET` | `/api/trending/warm` | 🌐 public | routes/trending.ts:63 |

## upload — upload

| Method | Path | Auth | Source |
|---|---|---|---|
| `POST` | `/api/upload/` | 🔒 auth | routes/upload.ts:9 |

## variants — variants

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/variants/product/:productId` | ⚪ optional | routes/variants.ts:8 |
| `POST` | `/api/variants/product/:productId` | 🔒 auth | routes/variants.ts:15 |
| `PUT` | `/api/variants/:id` | 🔒 auth | routes/variants.ts:30 |
| `DELETE` | `/api/variants/:id` | 🔒 auth | routes/variants.ts:42 |

## verification — verification

| Method | Path | Auth | Source |
|---|---|---|---|
| `POST` | `/api/verification/request` | 🔒 auth | routes/verification.ts:8 |
| `GET` | `/api/verification/my-request` | 🔒 auth | routes/verification.ts:28 |
| `GET` | `/api/verification/` | 👑 admin | routes/verification.ts:38 |
| `PUT` | `/api/verification/:id/approve` | 👑 admin | routes/verification.ts:51 |
| `PUT` | `/api/verification/:id/reject` | 👑 admin | routes/verification.ts:66 |

## wallet — Wallet management

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/wallet/me` | 🔒 auth | routes/wallet.ts:63 |
| `POST` | `/api/wallet/topup` | 🔒 auth | routes/wallet.ts:74 |
| `POST` | `/api/wallet/withdraw` | 🔒 auth | routes/wallet.ts:87 |
| `POST` | `/api/wallet/debit` | 🔒 auth | routes/wallet.ts:100 |
| `POST` | `/api/wallet/refund` | 🔒 auth | routes/wallet.ts:113 |
| `POST` | `/api/wallet/topup/chapa` | 🔒 auth | routes/wallet.ts:128 |
| `GET` | `/api/wallet/topup/chapa/sandbox` | 🌐 public | routes/wallet.ts:164 |
| `GET` | `/api/wallet/topup/chapa/verify/:tx_ref` | 🌐 public | routes/wallet.ts:178 |
| `POST` | `/api/wallet/topup/stripe` | 🔒 auth | routes/wallet.ts:242 |

## wishlists — wishlists

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/wishlists/` | 🔒 auth | routes/wishlists.ts:8 |
| `GET` | `/api/price-alerts/` | 🔒 auth | routes/wishlists.ts:8 |
| `GET` | `/api/wishlists/check/:productId` | 🔒 auth | routes/wishlists.ts:19 |
| `GET` | `/api/price-alerts/check/:productId` | 🔒 auth | routes/wishlists.ts:19 |
| `POST` | `/api/wishlists/` | 🔒 auth | routes/wishlists.ts:26 |
| `POST` | `/api/price-alerts/` | 🔒 auth | routes/wishlists.ts:26 |
| `DELETE` | `/api/wishlists/:productId` | 🔒 auth | routes/wishlists.ts:35 |
| `DELETE` | `/api/price-alerts/:productId` | 🔒 auth | routes/wishlists.ts:35 |
| `GET` | `/api/wishlists/price-alerts` | 🔒 auth | routes/wishlists.ts:44 |
| `GET` | `/api/price-alerts/price-alerts` | 🔒 auth | routes/wishlists.ts:44 |
| `POST` | `/api/wishlists/price-alerts` | 🔒 auth | routes/wishlists.ts:54 |
| `POST` | `/api/price-alerts/price-alerts` | 🔒 auth | routes/wishlists.ts:54 |
| `DELETE` | `/api/wishlists/price-alerts/:productId` | 🔒 auth | routes/wishlists.ts:67 |
| `DELETE` | `/api/price-alerts/price-alerts/:productId` | 🔒 auth | routes/wishlists.ts:67 |

---

*Endpoint-level request/response schemas live in the module source under
`backend/routes/` — the JSON twin of this page is `backend/api-catalog.json`.*