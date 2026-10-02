# Nodbusiness — API Reference

> **AUTO-GENERATED** from the route sources by `backend/scripts/generate-api-docs.js`.
> Do not hand-edit. After any route change run `npm run docs:api` (in `backend/`)
> and commit the regenerated file in the same PR.
> Endpoints: **298** across **49** mounted modules · Generated: 2026-10-02

| Legend | Meaning |
|---|---|
| 🔒 auth | Valid access token required (`requireAuth`) |
| 👑 admin | Admin role required (`requireAuth` + `requireAdmin`) |
| ⚪ optional | Token personalizes the response when present |
| 🌐 public | No token required |

Standard error shape: `{ "error": string, "code": string, "request_id"?: string }`
with `422 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`, `500 INTERNAL_ERROR`. Every response also carries `API-Version: 1`.

## Contents
- [`admin`](#admin) (19)
- [`ai`](#ai) (3)
- [`auth`](#auth) (16)
- [`businessApiKeys`](#businessapikeys) (3)
- [`businesses`](#businesses) (5)
- [`businessWebhooks`](#businesswebhooks) (4)
- [`cart`](#cart) (5)
- [`commission`](#commission) (2)
- [`coupons`](#coupons) (6)
- [`courses`](#courses) (8)
- [`delivery`](#delivery) (2)
- [`devops`](#devops) (15)
- [`docs`](#docs) (1)
- [`events`](#events) (7)
- [`externalSources`](#externalsources) (9)
- [`flags`](#flags) (3)
- [`friends`](#friends) (1)
- [`hashtags`](#hashtags) (3)
- [`jobs`](#jobs) (8)
- [`locations`](#locations) (2)
- [`maps`](#maps) (2)
- [`messages`](#messages) (22)
- [`mewacho`](#mewacho) (10)
- [`moderation`](#moderation) (3)
- [`notifications`](#notifications) (6)
- [`orders`](#orders) (11)
- [`polls`](#polls) (2)
- [`posts`](#posts) (10)
- [`products`](#products) (7)
- [`profiles`](#profiles) (11)
- [`proxy`](#proxy) (1)
- [`push`](#push) (3)
- [`referral`](#referral) (1)
- [`returns`](#returns) (6)
- [`reviews`](#reviews) (4)
- [`saves`](#saves) (3)
- [`search`](#search) (1)
- [`showrooms`](#showrooms) (9)
- [`stories`](#stories) (8)
- [`subscriptions`](#subscriptions) (5)
- [`suggestions`](#suggestions) (2)
- [`tasks`](#tasks) (10)
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
| `GET` | `/api/admin/stats` | 🌐 public | routes/admin.ts:24 |
| `GET` | `/api/admin/users` | 🌐 public | routes/admin.ts:54 |
| `PUT` | `/api/admin/users/:id/role` | 🌐 public | routes/admin.ts:87 |
| `DELETE` | `/api/admin/users/:id` | 🌐 public | routes/admin.ts:108 |
| `POST` | `/api/admin/users/:id/ban` | 🌐 public | routes/admin.ts:136 |
| `POST` | `/api/admin/users/:id/unban` | 🌐 public | routes/admin.ts:162 |
| `GET` | `/api/admin/verifications` | 🌐 public | routes/admin.ts:175 |
| `POST` | `/api/admin/verifications/:userId` | 🌐 public | routes/admin.ts:190 |
| `DELETE` | `/api/admin/verifications/:userId` | 🌐 public | routes/admin.ts:209 |
| `GET` | `/api/admin/posts` | 🌐 public | routes/admin.ts:221 |
| `DELETE` | `/api/admin/posts/:id` | 🌐 public | routes/admin.ts:235 |
| `GET` | `/api/admin/products` | 🌐 public | routes/admin.ts:248 |
| `DELETE` | `/api/admin/products/:id` | 🌐 public | routes/admin.ts:262 |
| `GET` | `/api/admin/orders` | 🌐 public | routes/admin.ts:268 |
| `GET` | `/api/admin/reports` | 🌐 public | routes/admin.ts:283 |
| `PUT` | `/api/admin/reports/:id` | 🌐 public | routes/admin.ts:292 |
| `PUT` | `/api/admin/users/:id/verify` | 🌐 public | routes/admin.ts:300 |
| `GET` | `/api/admin/stats/revenue` | 🌐 public | routes/admin.ts:308 |
| `GET` | `/api/admin/audit-logs` | 🌐 public | routes/admin.ts:328 |

## ai — ai

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/ai/status` | 🌐 public | routes/ai.ts:49 |
| `POST` | `/api/ai/generate` | 🔒 auth | routes/ai.ts:53 |
| `POST` | `/api/ai/chat` | 🔒 auth | routes/ai.ts:70 |

## auth — Authentication endpoints

| Method | Path | Auth | Source |
|---|---|---|---|
| `POST` | `/api/auth/register` | 🌐 public | routes/auth.ts:187 |
| `POST` | `/api/auth/verify-otp` | 🌐 public | routes/auth.ts:281 |
| `POST` | `/api/auth/resend-otp` | 🌐 public | routes/auth.ts:372 |
| `POST` | `/api/auth/demo` | 🌐 public | routes/auth.ts:437 |
| `POST` | `/api/auth/demo/exit` | 🌐 public | routes/auth.ts:507 |
| `POST` | `/api/auth/demo/reset` | 🌐 public | routes/auth.ts:527 |
| `POST` | `/api/auth/onboarding-mode` | 🔒 auth | routes/auth.ts:544 |
| `POST` | `/api/auth/login` | 🌐 public | routes/auth.ts:565 |
| `POST` | `/api/auth/google` | 🌐 public | routes/auth.ts:694 |
| `GET` | `/api/auth/me` | 🔒 auth | routes/auth.ts:828 |
| `POST` | `/api/auth/forgot-password` | 🌐 public | routes/auth.ts:869 |
| `POST` | `/api/auth/reset-password` | 🌐 public | routes/auth.ts:904 |
| `PUT` | `/api/auth/change-password` | 🔒 auth | routes/auth.ts:967 |
| `POST` | `/api/auth/refresh` | 🌐 public | routes/auth.ts:1019 |
| `POST` | `/api/auth/logout` | 🌐 public | routes/auth.ts:1104 |
| `POST` | `/api/auth/logout-all` | 🔒 auth | routes/auth.ts:1144 |

## businessApiKeys — Business API key management

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/business-api-keys/` | 🔒 auth | routes/businessApiKeys.ts:42 |
| `POST` | `/api/business-api-keys/` | 🔒 auth | routes/businessApiKeys.ts:68 |
| `DELETE` | `/api/business-api-keys/:id` | 🔒 auth | routes/businessApiKeys.ts:107 |

## businesses — businesses

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/businesses/` | ⚪ optional | routes/businesses.ts:10 |
| `GET` | `/api/businesses/:id` | ⚪ optional | routes/businesses.ts:19 |
| `POST` | `/api/businesses/` | 🔒 auth | routes/businesses.ts:27 |
| `PUT` | `/api/businesses/:id` | 🔒 auth | routes/businesses.ts:42 |
| `DELETE` | `/api/businesses/:id` | 🔒 auth | routes/businesses.ts:53 |

## businessWebhooks — Business webhook management

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/business-webhooks/` | 🔒 auth | routes/businessWebhooks.ts:57 |
| `POST` | `/api/business-webhooks/` | 🔒 auth | routes/businessWebhooks.ts:81 |
| `PUT` | `/api/business-webhooks/:id` | 🔒 auth | routes/businessWebhooks.ts:136 |
| `DELETE` | `/api/business-webhooks/:id` | 🔒 auth | routes/businessWebhooks.ts:231 |

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
| `GET` | `/api/coupons/mine` | 🔒 auth | routes/coupons.ts:34 |
| `POST` | `/api/coupons/validate` | 🌐 public | routes/coupons.ts:41 |
| `POST` | `/api/coupons/use` | 🔒 auth | routes/coupons.ts:61 |
| `PATCH` | `/api/coupons/:id/toggle` | 🔒 auth | routes/coupons.ts:67 |
| `DELETE` | `/api/coupons/:id` | 🔒 auth | routes/coupons.ts:77 |

## courses — courses

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/courses/` | ⚪ optional | routes/courses.ts:9 |
| `GET` | `/api/courses/:id` | ⚪ optional | routes/courses.ts:18 |
| `POST` | `/api/courses/` | 🔒 auth | routes/courses.ts:27 |
| `PUT` | `/api/courses/:id` | 🔒 auth | routes/courses.ts:36 |
| `POST` | `/api/courses/:id/lessons` | 🔒 auth | routes/courses.ts:47 |
| `POST` | `/api/courses/:id/enroll` | 🔒 auth | routes/courses.ts:62 |
| `GET` | `/api/courses/:id/enrolled` | 🔒 auth | routes/courses.ts:75 |
| `PUT` | `/api/courses/:id/progress` | 🔒 auth | routes/courses.ts:82 |

## delivery — delivery

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/delivery/order/:orderId` | 🔒 auth | routes/delivery.ts:9 |
| `POST` | `/api/delivery/` | 🔒 auth | routes/delivery.ts:26 |

## devops — devops

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/devops/` | 👑 admin | routes/devops.ts:13 |
| `POST` | `/api/devops/` | 👑 admin | routes/devops.ts:20 |
| `PUT` | `/api/devops/:id` | 👑 admin | routes/devops.ts:37 |
| `DELETE` | `/api/devops/:id` | 👑 admin | routes/devops.ts:56 |
| `GET` | `/api/devops/errors` | 👑 admin | routes/devops.ts:65 |
| `PUT` | `/api/devops/errors/:id/resolve` | 👑 admin | routes/devops.ts:80 |
| `POST` | `/api/devops/errors/report` | ⚪ optional | routes/devops.ts:93 |
| `GET` | `/api/devops/versions` | 🌐 public | routes/devops.ts:108 |
| `PUT` | `/api/devops/versions` | 👑 admin | routes/devops.ts:115 |
| `GET` | `/api/devops/health-summary` | 👑 admin | routes/devops.ts:130 |
| `GET` | `/api/devops/telemetry` | 👑 admin | routes/devops.ts:165 |
| `POST` | `/api/devops/copilot` | 👑 admin | routes/devops.ts:304 |
| `GET` | `/api/devops/scorecard` | 👑 admin | routes/devops.ts:327 |
| `GET` | `/api/devops/log-report` | 👑 admin | routes/devops.ts:339 |
| `GET` | `/api/devops/log-report/:file` | 👑 admin | routes/devops.ts:358 |

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
| `PUT` | `/api/events/:id` | 🔒 auth | routes/events.ts:33 |
| `DELETE` | `/api/events/:id` | 🔒 auth | routes/events.ts:44 |
| `POST` | `/api/events/:id/book` | 🔒 auth | routes/events.ts:54 |
| `GET` | `/api/events/:id/attendees` | ⚪ optional | routes/events.ts:92 |

## externalSources — External Data Sources

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/showrooms/:showroomId/external-sources/health` | 🌐 public | routes/externalSources.ts:90 |
| `GET` | `/api/showrooms/:showroomId/external-sources/` | 🌐 public | routes/externalSources.ts:114 |
| `POST` | `/api/showrooms/:showroomId/external-sources/` | 🌐 public | routes/externalSources.ts:126 |
| `PUT` | `/api/showrooms/:showroomId/external-sources/:sourceId` | 🌐 public | routes/externalSources.ts:149 |
| `DELETE` | `/api/showrooms/:showroomId/external-sources/:sourceId` | 🌐 public | routes/externalSources.ts:174 |
| `GET` | `/api/showrooms/:showroomId/external-sources/:sourceId/mappings` | 🌐 public | routes/externalSources.ts:189 |
| `POST` | `/api/showrooms/:showroomId/external-sources/:sourceId/mappings` | 🌐 public | routes/externalSources.ts:199 |
| `DELETE` | `/api/showrooms/:showroomId/external-sources/:sourceId/mappings/:mappingId` | 🌐 public | routes/externalSources.ts:214 |
| `POST` | `/api/showrooms/:showroomId/external-sources/:sourceId/refresh` | 🌐 public | routes/externalSources.ts:226 |

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
| `GET` | `/api/hashtags/:name` | ⚪ optional | routes/hashtags.ts:43 |
| `GET` | `/api/hashtags/:name/posts` | ⚪ optional | routes/hashtags.ts:67 |

## jobs — jobs

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/jobs/` | ⚪ optional | routes/jobs.ts:9 |
| `GET` | `/api/jobs/:id` | ⚪ optional | routes/jobs.ts:20 |
| `POST` | `/api/jobs/` | 🔒 auth | routes/jobs.ts:28 |
| `PUT` | `/api/jobs/:id` | 🔒 auth | routes/jobs.ts:37 |
| `DELETE` | `/api/jobs/:id` | 🔒 auth | routes/jobs.ts:48 |
| `POST` | `/api/jobs/:id/apply` | 🔒 auth | routes/jobs.ts:58 |
| `GET` | `/api/jobs/:id/applications` | 🔒 auth | routes/jobs.ts:73 |
| `PUT` | `/api/jobs/applications/:id` | 🔒 auth | routes/jobs.ts:89 |

## locations — Live GPS location for Enterprise businesses

| Method | Path | Auth | Source |
|---|---|---|---|
| `POST` | `/api/locations/update` | 🔒 auth | routes/locations.ts:30 |
| `GET` | `/api/locations/:businessId` | 🌐 public | routes/locations.ts:104 |

## maps — maps

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/maps/nearby/product-search` | ⚪ optional | routes/maps.ts:25 |
| `GET` | `/api/maps/nearby` | ⚪ optional | routes/maps.ts:102 |

## messages — Conversations and real-time messaging

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/messages/conversations` | 🔒 auth | routes/messages.ts:80 |
| `GET` | `/api/messages/conversations/:id` | 🔒 auth | routes/messages.ts:105 |
| `POST` | `/api/messages/conversations/find-or-create` | 🔒 auth | routes/messages.ts:114 |
| `POST` | `/api/messages/conversations` | 🔒 auth | routes/messages.ts:152 |
| `PUT` | `/api/messages/conversations/:id` | 🔒 auth | routes/messages.ts:174 |
| `GET` | `/api/messages/conversations/:convId/messages` | 🔒 auth | routes/messages.ts:198 |
| `POST` | `/api/messages/conversations/:convId/messages` | 🔒 auth | routes/messages.ts:211 |
| `PUT` | `/api/messages/messages/:id` | 🔒 auth | routes/messages.ts:265 |
| `DELETE` | `/api/messages/messages/:id` | 🔒 auth | routes/messages.ts:278 |
| `DELETE` | `/api/messages/conversations/:id/history` | 🔒 auth | routes/messages.ts:289 |
| `POST` | `/api/messages/conversations/:id/leave` | 🔒 auth | routes/messages.ts:297 |
| `POST` | `/api/messages/conversations/:id/members` | 🔒 auth | routes/messages.ts:309 |
| `DELETE` | `/api/messages/conversations/:id/members/:userId` | 🔒 auth | routes/messages.ts:324 |
| `DELETE` | `/api/messages/conversations/:id` | 🔒 auth | routes/messages.ts:337 |
| `PUT` | `/api/messages/presence` | 🔒 auth | routes/messages.ts:350 |
| `GET` | `/api/messages/presence/:userId` | 🔒 auth | routes/messages.ts:363 |
| `PUT` | `/api/messages/presence/settings` | 🔒 auth | routes/messages.ts:378 |
| `POST` | `/api/messages/block/:targetId` | 🔒 auth | routes/messages.ts:387 |
| `DELETE` | `/api/messages/block/:targetId` | 🔒 auth | routes/messages.ts:393 |
| `GET` | `/api/messages/block/:targetId` | 🔒 auth | routes/messages.ts:398 |
| `POST` | `/api/messages/messages/:id/forward` | 🔒 auth | routes/messages.ts:405 |
| `POST` | `/api/messages/inquiry` | 🔒 auth | routes/messages.ts:424 |

## mewacho — Mewacho (ምውጮ) group money collection

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/mewacho/groups` | 🔒 auth | routes/mewacho.ts:98 |
| `POST` | `/api/mewacho/groups` | 🔒 auth | routes/mewacho.ts:121 |
| `GET` | `/api/mewacho/groups/join/:invite_code` | 🔒 auth | routes/mewacho.ts:159 |
| `GET` | `/api/mewacho/groups/:id` | 🔒 auth | routes/mewacho.ts:191 |
| `POST` | `/api/mewacho/groups/:id/contribute` | 🔒 auth | routes/mewacho.ts:265 |
| `POST` | `/api/mewacho/groups/:id/message` | 🔒 auth | routes/mewacho.ts:347 |
| `POST` | `/api/mewacho/groups/:id/withdraw` | 🔒 auth | routes/mewacho.ts:370 |
| `PUT` | `/api/mewacho/withdrawals/:wid/approve` | 🔒 auth | routes/mewacho.ts:448 |
| `PUT` | `/api/mewacho/withdrawals/:wid/reject` | 🔒 auth | routes/mewacho.ts:484 |
| `POST` | `/api/mewacho/webhook` | 🌐 public | routes/mewacho.ts:510 |

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
| `PUT` | `/api/notifications/read-all` | 🔒 auth | routes/notifications.ts:92 |
| `POST` | `/api/notifications/mark-read` | 🔒 auth | routes/notifications.ts:99 |
| `PUT` | `/api/notifications/:id/read` | 🔒 auth | routes/notifications.ts:114 |
| `DELETE` | `/api/notifications/:id` | 🔒 auth | routes/notifications.ts:125 |

## orders — Orders, Stripe + Chapa payments, webhooks

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/orders/` | 🔒 auth | routes/orders.ts:83 |
| `GET` | `/api/orders/session/:sessionId` | 🔒 auth | routes/orders.ts:112 |
| `GET` | `/api/orders/:id` | 🔒 auth | routes/orders.ts:120 |
| `POST` | `/api/orders/` | 🔒 auth | routes/orders.ts:164 |
| `PUT` | `/api/orders/:id` | 🔒 auth | routes/orders.ts:235 |
| `POST` | `/api/orders/checkout/session` | 🔒 auth | routes/orders.ts:292 |
| `POST` | `/api/orders/webhook` | 🌐 public | routes/orders.ts:493 |
| `POST` | `/api/orders/checkout/chapa` | 🔒 auth | routes/orders.ts:527 |
| `GET` | `/api/orders/chapa/sandbox` | 🌐 public | routes/orders.ts:588 |
| `GET` | `/api/orders/chapa/status/:tx_ref` | 🌐 public | routes/orders.ts:600 |
| `GET` | `/api/orders/chapa/verify/:tx_ref` | 🌐 public | routes/orders.ts:611 |

## polls — polls

| Method | Path | Auth | Source |
|---|---|---|---|
| `POST` | `/api/polls/:postId/vote` | 🔒 auth | routes/polls.ts:8 |
| `GET` | `/api/polls/:postId/results` | ⚪ optional | routes/polls.ts:43 |

## posts — Social feed posts

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/posts/` | ⚪ optional | routes/posts.ts:38 |
| `GET` | `/api/posts/:id` | ⚪ optional | routes/posts.ts:102 |
| `POST` | `/api/posts/` | 🔒 auth | routes/posts.ts:111 |
| `PUT` | `/api/posts/:id` | 🔒 auth | routes/posts.ts:143 |
| `DELETE` | `/api/posts/:id` | 🔒 auth | routes/posts.ts:164 |
| `GET` | `/api/posts/:id/like` | ⚪ optional | routes/posts.ts:176 |
| `POST` | `/api/posts/:id/like` | 🔒 auth | routes/posts.ts:184 |
| `GET` | `/api/posts/:id/comments` | ⚪ optional | routes/posts.ts:214 |
| `POST` | `/api/posts/:id/comments` | 🔒 auth | routes/posts.ts:228 |
| `DELETE` | `/api/posts/:postId/comments/:commentId` | 🔒 auth | routes/posts.ts:280 |

## products — Marketplace products

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/products/` | ⚪ optional | routes/products.ts:49 |
| `GET` | `/api/products/mine` | 🔒 auth | routes/products.ts:117 |
| `GET` | `/api/products/:id` | ⚪ optional | routes/products.ts:130 |
| `POST` | `/api/products/` | 🔒 auth | routes/products.ts:143 |
| `PUT` | `/api/products/:id` | 🔒 auth | routes/products.ts:176 |
| `DELETE` | `/api/products/:id` | 🔒 auth | routes/products.ts:254 |
| `POST` | `/api/products/bulk-import` | 🔒 auth | routes/products.ts:266 |

## profiles — profiles

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/profiles/me` | 🔒 auth | routes/profiles.ts:83 |
| `GET` | `/api/profiles/by-user/:userId` | ⚪ optional | routes/profiles.ts:91 |
| `GET` | `/api/profiles/me/follows` | 🔒 auth | routes/profiles.ts:104 |
| `GET` | `/api/profiles/follows` | 🔒 auth | routes/profiles.ts:111 |
| `GET` | `/api/profiles/:id` | ⚪ optional | routes/profiles.ts:118 |
| `GET` | `/api/profiles/` | ⚪ optional | routes/profiles.ts:136 |
| `POST` | `/api/profiles/` | 🔒 auth | routes/profiles.ts:173 |
| `PUT` | `/api/profiles/me/upsert` | 🔒 auth | routes/profiles.ts:190 |
| `PUT` | `/api/profiles/:id` | 🔒 auth | routes/profiles.ts:210 |
| `PATCH` | `/api/profiles/me/ticker` | 🔒 auth | routes/profiles.ts:228 |
| `POST` | `/api/profiles/follow/:targetUserId` | 🔒 auth | routes/profiles.ts:254 |

## proxy — Public Proxy Route

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/proxy/:showroomId/:sectionKey` | ⚪ optional | routes/proxy.ts:17 |

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

## returns — returns

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/returns/` | 🔒 auth | routes/returns.ts:12 |
| `GET` | `/api/returns/seller` | 🔒 auth | routes/returns.ts:30 |
| `POST` | `/api/returns/` | 🔒 auth | routes/returns.ts:46 |
| `PUT` | `/api/returns/:id/approve` | 🔒 auth | routes/returns.ts:187 |
| `PUT` | `/api/returns/:id/reject` | 🔒 auth | routes/returns.ts:188 |
| `PUT` | `/api/returns/:id` | 🔒 auth | routes/returns.ts:189 |

## reviews — reviews

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/reviews/` | ⚪ optional | routes/reviews.ts:9 |
| `GET` | `/api/reviews/product/:productId` | ⚪ optional | routes/reviews.ts:34 |
| `POST` | `/api/reviews/` | 🔒 auth | routes/reviews.ts:50 |
| `DELETE` | `/api/reviews/:id` | 🔒 auth | routes/reviews.ts:72 |

## saves — saves

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/saves/` | 🔒 auth | routes/saves.ts:8 |
| `POST` | `/api/saves/toggle` | 🔒 auth | routes/saves.ts:66 |
| `GET` | `/api/saves/check/:targetId` | 🔒 auth | routes/saves.ts:80 |

## search — Cross-entity full-text search

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/search/` | ⚪ optional | routes/search.ts:45 |

## showrooms — showrooms

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/showrooms/` | ⚪ optional | routes/showrooms.ts:13 |
| `GET` | `/api/showrooms/slug/:slug` | ⚪ optional | routes/showrooms.ts:24 |
| `POST` | `/api/showrooms/:id/recheck/:sectionKey` | 🔒 auth | routes/showrooms.ts:36 |
| `GET` | `/api/showrooms/:id/doctor` | 🔒 auth | routes/showrooms.ts:61 |
| `GET` | `/api/showrooms/sitemap-data` | 🌐 public | routes/showrooms.ts:118 |
| `GET` | `/api/showrooms/:id` | ⚪ optional | routes/showrooms.ts:128 |
| `POST` | `/api/showrooms/` | 🔒 auth | routes/showrooms.ts:136 |
| `PUT` | `/api/showrooms/:id` | 🔒 auth | routes/showrooms.ts:153 |
| `DELETE` | `/api/showrooms/:id` | 🔒 auth | routes/showrooms.ts:164 |

## stories — stories

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/stories/` | ⚪ optional | routes/stories.ts:15 |
| `GET` | `/api/stories/user/:userId` | ⚪ optional | routes/stories.ts:29 |
| `POST` | `/api/stories/` | 🔒 auth | routes/stories.ts:42 |
| `POST` | `/api/stories/:id/view` | 🔒 auth | routes/stories.ts:54 |
| `POST` | `/api/stories/:id/reactions` | 🔒 auth | routes/stories.ts:62 |
| `GET` | `/api/stories/:id/comments` | 🔒 auth | routes/stories.ts:77 |
| `POST` | `/api/stories/:id/comments` | 🔒 auth | routes/stories.ts:84 |
| `DELETE` | `/api/stories/:id` | 🔒 auth | routes/stories.ts:102 |

## subscriptions — Business subscription lifecycle

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/subscriptions/plans` | 🌐 public | routes/subscriptions.ts:68 |
| `GET` | `/api/subscriptions/my` | 🔒 auth | routes/subscriptions.ts:85 |
| `POST` | `/api/subscriptions/create` | 🔒 auth | routes/subscriptions.ts:114 |
| `POST` | `/api/subscriptions/cancel` | 🔒 auth | routes/subscriptions.ts:158 |
| `POST` | `/api/subscriptions/webhook` | 🌐 public | routes/subscriptions.ts:197 |

## suggestions — suggestions

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/suggestions/people` | 🔒 auth | routes/suggestions.ts:9 |
| `POST` | `/api/suggestions/dismiss/:targetUserId` | 🔒 auth | routes/suggestions.ts:74 |

## tasks — tasks

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/tasks/` | ⚪ optional | routes/tasks.ts:54 |
| `GET` | `/api/tasks/bids` | 🔒 auth | routes/tasks.ts:67 |
| `GET` | `/api/tasks/bids/:bidId` | 🔒 auth | routes/tasks.ts:85 |
| `GET` | `/api/tasks/:id` | ⚪ optional | routes/tasks.ts:99 |
| `POST` | `/api/tasks/` | 🔒 auth | routes/tasks.ts:107 |
| `PUT` | `/api/tasks/bids/:bidId` | 🔒 auth | routes/tasks.ts:130 |
| `PUT` | `/api/tasks/:id` | 🔒 auth | routes/tasks.ts:223 |
| `DELETE` | `/api/tasks/:id` | 🔒 auth | routes/tasks.ts:270 |
| `GET` | `/api/tasks/:taskId/bids` | ⚪ optional | routes/tasks.ts:280 |
| `POST` | `/api/tasks/:taskId/bids` | 🔒 auth | routes/tasks.ts:291 |

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
| `GET` | `/api/trending/warm` | ⚪ optional | routes/trending.ts:63 |

## upload — upload

| Method | Path | Auth | Source |
|---|---|---|---|
| `POST` | `/api/upload/` | 🔒 auth | routes/upload.ts:9 |

## variants — variants

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/variants/product/:productId` | ⚪ optional | routes/variants.ts:8 |
| `POST` | `/api/variants/product/:productId` | 🔒 auth | routes/variants.ts:22 |
| `PUT` | `/api/variants/:id` | 🔒 auth | routes/variants.ts:37 |
| `DELETE` | `/api/variants/:id` | 🔒 auth | routes/variants.ts:49 |

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
| `GET` | `/api/wallet/me` | 🔒 auth | routes/wallet.ts:84 |
| `POST` | `/api/wallet/topup` | 🔒 auth | routes/wallet.ts:95 |
| `POST` | `/api/wallet/withdraw` | 🔒 auth | routes/wallet.ts:108 |
| `POST` | `/api/wallet/debit` | 🔒 auth | routes/wallet.ts:121 |
| `POST` | `/api/wallet/refund` | 🔒 auth | routes/wallet.ts:134 |
| `POST` | `/api/wallet/topup/chapa` | 🔒 auth | routes/wallet.ts:149 |
| `GET` | `/api/wallet/topup/chapa/sandbox` | 🌐 public | routes/wallet.ts:186 |
| `GET` | `/api/wallet/topup/chapa/verify/:tx_ref` | 🌐 public | routes/wallet.ts:200 |
| `POST` | `/api/wallet/topup/stripe` | 🔒 auth | routes/wallet.ts:268 |

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