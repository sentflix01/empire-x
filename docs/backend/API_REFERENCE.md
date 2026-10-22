# Nodbusiness — API Reference

> **AUTO-GENERATED** from the route sources by `backend/scripts/generate-api-docs.js`.
> Do not hand-edit. After any route change run `npm run docs:api` (in `backend/`)
> and commit the regenerated file in the same PR.
> Endpoints: **347** across **50** mounted modules · Generated: 2026-10-22

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
- [`auth`](#auth) (19)
- [`businessApiKeys`](#businessapikeys) (3)
- [`businesses`](#businesses) (10)
- [`businessWebhooks`](#businesswebhooks) (4)
- [`cart`](#cart) (5)
- [`commission`](#commission) (2)
- [`coupons`](#coupons) (6)
- [`delivery`](#delivery) (2)
- [`devops`](#devops) (15)
- [`directOrders`](#directorders) (12)
- [`docs`](#docs) (1)
- [`externalSources`](#externalsources) (9)
- [`flags`](#flags) (4)
- [`friends`](#friends) (1)
- [`hashtags`](#hashtags) (3)
- [`internalJobs`](#internaljobs) (1)
- [`locations`](#locations) (2)
- [`maps`](#maps) (2)
- [`messages`](#messages) (45)
- [`moderation`](#moderation) (3)
- [`notifications`](#notifications) (6)
- [`orders`](#orders) (11)
- [`polls`](#polls) (2)
- [`posts`](#posts) (19)
- [`products`](#products) (10)
- [`profilePartnerships`](#profilepartnerships) (10)
- [`profiles`](#profiles) (11)
- [`proxy`](#proxy) (1)
- [`push`](#push) (3)
- [`referral`](#referral) (1)
- [`returns`](#returns) (6)
- [`reviews`](#reviews) (4)
- [`saves`](#saves) (3)
- [`search`](#search) (1)
- [`sharePreview`](#sharepreview) (2)
- [`showrooms`](#showrooms) (12)
- [`social`](#social) (10)
- [`stories`](#stories) (8)
- [`subscriptions`](#subscriptions) (5)
- [`subscriptionsEtb`](#subscriptionsetb) (9)
- [`suggestions`](#suggestions) (2)
- [`telegram`](#telegram) (4)
- [`trending`](#trending) (2)
- [`upload`](#upload) (1)
- [`variants`](#variants) (4)
- [`verification`](#verification) (6)
- [`wallet`](#wallet) (9)
- [`wishlists`](#wishlists) (14)


## admin — admin

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/admin/stats` | 🌐 public | routes/admin.ts:24 |
| `GET` | `/api/admin/users` | 🌐 public | routes/admin.ts:52 |
| `PUT` | `/api/admin/users/:id/role` | 🌐 public | routes/admin.ts:85 |
| `DELETE` | `/api/admin/users/:id` | 🌐 public | routes/admin.ts:106 |
| `POST` | `/api/admin/users/:id/ban` | 🌐 public | routes/admin.ts:134 |
| `POST` | `/api/admin/users/:id/unban` | 🌐 public | routes/admin.ts:160 |
| `GET` | `/api/admin/verifications` | 🌐 public | routes/admin.ts:173 |
| `POST` | `/api/admin/verifications/:userId` | 🌐 public | routes/admin.ts:188 |
| `DELETE` | `/api/admin/verifications/:userId` | 🌐 public | routes/admin.ts:207 |
| `GET` | `/api/admin/posts` | 🌐 public | routes/admin.ts:219 |
| `DELETE` | `/api/admin/posts/:id` | 🌐 public | routes/admin.ts:233 |
| `GET` | `/api/admin/products` | 🌐 public | routes/admin.ts:246 |
| `DELETE` | `/api/admin/products/:id` | 🌐 public | routes/admin.ts:260 |
| `GET` | `/api/admin/orders` | 🌐 public | routes/admin.ts:266 |
| `GET` | `/api/admin/reports` | 🌐 public | routes/admin.ts:281 |
| `PUT` | `/api/admin/reports/:id` | 🌐 public | routes/admin.ts:290 |
| `PUT` | `/api/admin/users/:id/verify` | 🌐 public | routes/admin.ts:298 |
| `GET` | `/api/admin/stats/revenue` | 🌐 public | routes/admin.ts:306 |
| `GET` | `/api/admin/audit-logs` | 🌐 public | routes/admin.ts:326 |

## ai — ai

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/ai/status` | 🌐 public | routes/ai.ts:50 |
| `POST` | `/api/ai/generate` | 🔒 auth | routes/ai.ts:54 |
| `POST` | `/api/ai/chat` | 🔒 auth | routes/ai.ts:71 |

## auth — Authentication endpoints

| Method | Path | Auth | Source |
|---|---|---|---|
| `POST` | `/api/auth/register` | 🌐 public | routes/auth.ts:219 |
| `POST` | `/api/auth/verify-otp` | 🌐 public | routes/auth.ts:318 |
| `POST` | `/api/auth/resend-otp` | 🌐 public | routes/auth.ts:409 |
| `POST` | `/api/auth/demo` | 🌐 public | routes/auth.ts:446 |
| `POST` | `/api/auth/demo/exit` | 🌐 public | routes/auth.ts:515 |
| `POST` | `/api/auth/demo/reset` | 🌐 public | routes/auth.ts:535 |
| `POST` | `/api/auth/workspace` | 🔒 auth | routes/auth.ts:553 |
| `POST` | `/api/auth/onboarding-mode` | 🌐 public | routes/auth.ts:559 |
| `POST` | `/api/auth/login` | 🌐 public | routes/auth.ts:566 |
| `POST` | `/api/auth/google` | 🌐 public | routes/auth.ts:683 |
| `GET` | `/api/auth/me` | 🔒 auth | routes/auth.ts:837 |
| `GET` | `/api/auth/me/export` | 🔒 auth | routes/auth.ts:880 |
| `DELETE` | `/api/auth/me` | 🔒 auth | routes/auth.ts:893 |
| `POST` | `/api/auth/forgot-password` | 🌐 public | routes/auth.ts:943 |
| `POST` | `/api/auth/reset-password` | 🌐 public | routes/auth.ts:979 |
| `PUT` | `/api/auth/change-password` | 🔒 auth | routes/auth.ts:1033 |
| `POST` | `/api/auth/refresh` | 🌐 public | routes/auth.ts:1076 |
| `POST` | `/api/auth/logout` | 🌐 public | routes/auth.ts:1159 |
| `POST` | `/api/auth/logout-all` | 🔒 auth | routes/auth.ts:1199 |

## businessApiKeys — Business API key management

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/business-api-keys/` | 🔒 auth | routes/businessApiKeys.ts:42 |
| `POST` | `/api/business-api-keys/` | 🔒 auth | routes/businessApiKeys.ts:68 |
| `DELETE` | `/api/business-api-keys/:id` | 🔒 auth | routes/businessApiKeys.ts:107 |

## businesses — businesses

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/businesses/` | ⚪ optional | routes/businesses.ts:32 |
| `GET` | `/api/businesses/:id` | ⚪ optional | routes/businesses.ts:50 |
| `POST` | `/api/businesses/` | 🔒 auth | routes/businesses.ts:62 |
| `PUT` | `/api/businesses/:id` | 🔒 auth | routes/businesses.ts:83 |
| `DELETE` | `/api/businesses/:id` | 🔒 auth | routes/businesses.ts:96 |
| `GET` | `/api/businesses/:id/payment-accounts` | 🔒 auth | routes/businesses.ts:153 |
| `POST` | `/api/businesses/:id/payment-accounts` | 🔒 auth | routes/businesses.ts:161 |
| `PUT` | `/api/businesses/:id/payment-accounts/:accountId` | 🔒 auth | routes/businesses.ts:178 |
| `DELETE` | `/api/businesses/:id/payment-accounts/:accountId` | 🔒 auth | routes/businesses.ts:196 |
| `GET` | `/api/businesses/:id/checkout-info` | ⚪ optional | routes/businesses.ts:209 |

## businessWebhooks — Business webhook management

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/business-webhooks/` | 🔒 auth | routes/businessWebhooks.ts:62 |
| `POST` | `/api/business-webhooks/` | 🔒 auth | routes/businessWebhooks.ts:86 |
| `PUT` | `/api/business-webhooks/:id` | 🔒 auth | routes/businessWebhooks.ts:141 |
| `DELETE` | `/api/business-webhooks/:id` | 🔒 auth | routes/businessWebhooks.ts:236 |

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
| `GET` | `/api/commission/my-commissions` | 🔒 auth | routes/commission.ts:19 |
| `GET` | `/api/commission/admin/summary` | 👑 admin | routes/commission.ts:30 |

## coupons — coupons

| Method | Path | Auth | Source |
|---|---|---|---|
| `POST` | `/api/coupons/` | 🔒 auth | routes/coupons.ts:8 |
| `GET` | `/api/coupons/mine` | 🔒 auth | routes/coupons.ts:34 |
| `POST` | `/api/coupons/validate` | 🌐 public | routes/coupons.ts:41 |
| `POST` | `/api/coupons/use` | 🔒 auth | routes/coupons.ts:61 |
| `PATCH` | `/api/coupons/:id/toggle` | 🔒 auth | routes/coupons.ts:67 |
| `DELETE` | `/api/coupons/:id` | 🔒 auth | routes/coupons.ts:77 |

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

## directOrders — Buy by paying the seller directly (guest or signed in).

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/direct-orders/checkout-info` | ⚪ optional | routes/directOrders.ts:143 |
| `POST` | `/api/direct-orders/requests` | ⚪ optional | routes/directOrders.ts:237 |
| `POST` | `/api/direct-orders/` | ⚪ optional | routes/directOrders.ts:309 |
| `GET` | `/api/direct-orders/link/:token` | 🌐 public | routes/directOrders.ts:421 |
| `POST` | `/api/direct-orders/link/:token/report-payment` | 🌐 public | routes/directOrders.ts:456 |
| `POST` | `/api/direct-orders/:id/report-payment` | 🔒 auth | routes/directOrders.ts:464 |
| `POST` | `/api/direct-orders/:id/confirm-payment` | 🔒 auth | routes/directOrders.ts:474 |
| `POST` | `/api/direct-orders/:id/reject-payment` | 🔒 auth | routes/directOrders.ts:491 |
| `POST` | `/api/direct-orders/:id/set-price` | 🔒 auth | routes/directOrders.ts:510 |
| `POST` | `/api/direct-orders/:id/decline-request` | 🔒 auth | routes/directOrders.ts:539 |
| `GET` | `/api/direct-orders/link/:token/receipt` | 🌐 public | routes/directOrders.ts:563 |
| `GET` | `/api/direct-orders/:id/receipt` | 🔒 auth | routes/directOrders.ts:571 |

## docs — docs

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/docs/` | 🌐 public | routes/docs.ts:6 |

## externalSources — External Data Sources

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/showrooms/:showroomId/external-sources/health` | 🌐 public | routes/externalSources.ts:103 |
| `GET` | `/api/showrooms/:showroomId/external-sources/` | 🌐 public | routes/externalSources.ts:127 |
| `POST` | `/api/showrooms/:showroomId/external-sources/` | 🌐 public | routes/externalSources.ts:139 |
| `PUT` | `/api/showrooms/:showroomId/external-sources/:sourceId` | 🌐 public | routes/externalSources.ts:162 |
| `DELETE` | `/api/showrooms/:showroomId/external-sources/:sourceId` | 🌐 public | routes/externalSources.ts:187 |
| `GET` | `/api/showrooms/:showroomId/external-sources/:sourceId/mappings` | 🌐 public | routes/externalSources.ts:202 |
| `POST` | `/api/showrooms/:showroomId/external-sources/:sourceId/mappings` | 🌐 public | routes/externalSources.ts:212 |
| `DELETE` | `/api/showrooms/:showroomId/external-sources/:sourceId/mappings/:mappingId` | 🌐 public | routes/externalSources.ts:228 |
| `POST` | `/api/showrooms/:showroomId/external-sources/:sourceId/refresh` | 🌐 public | routes/externalSources.ts:240 |

## flags — flags

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/flags/page-guided-tours` | ⚪ optional | routes/flags.ts:10 |
| `GET` | `/api/flags/` | 🔒 auth | routes/flags.ts:16 |
| `GET` | `/api/flags/:name` | 🔒 auth | routes/flags.ts:30 |
| `PUT` | `/api/flags/:name` | 👑 admin | routes/flags.ts:37 |

## friends — friends

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/friends/mutual` | 🔒 auth | routes/friends.ts:8 |

## hashtags — hashtags

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/hashtags/trending` | 🌐 public | routes/hashtags.ts:48 |
| `GET` | `/api/hashtags/:name` | ⚪ optional | routes/hashtags.ts:68 |
| `GET` | `/api/hashtags/:name/posts` | ⚪ optional | routes/hashtags.ts:92 |

## internalJobs — run scheduled jobs on request.

| Method | Path | Auth | Source |
|---|---|---|---|
| `POST` | `/api/internal/jobs/:name` | 🌐 public | routes/internalJobs.ts:45 |

## locations — Live GPS location for Enterprise businesses

| Method | Path | Auth | Source |
|---|---|---|---|
| `POST` | `/api/locations/update` | 🔒 auth | routes/locations.ts:31 |
| `GET` | `/api/locations/:businessId` | ⚪ optional | routes/locations.ts:105 |

## maps — maps

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/maps/nearby/product-search` | ⚪ optional | routes/maps.ts:26 |
| `GET` | `/api/maps/nearby` | ⚪ optional | routes/maps.ts:104 |

## messages — Conversations and real-time messaging

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/messages/conversations` | 🔒 auth | routes/messages.ts:195 |
| `GET` | `/api/messages/unread-count` | 🔒 auth | routes/messages.ts:205 |
| `GET` | `/api/messages/conversations/:id` | 🔒 auth | routes/messages.ts:225 |
| `POST` | `/api/messages/conversations/:id/read` | 🔒 auth | routes/messages.ts:246 |
| `POST` | `/api/messages/delivered` | 🔒 auth | routes/messages.ts:279 |
| `PUT` | `/api/messages/conversations/:id/mute` | 🔒 auth | routes/messages.ts:301 |
| `PUT` | `/api/messages/conversations/:id/archive` | 🔒 auth | routes/messages.ts:318 |
| `POST` | `/api/messages/conversations/:id/accept` | 🔒 auth | routes/messages.ts:331 |
| `DELETE` | `/api/messages/conversations/:id/for-me` | 🔒 auth | routes/messages.ts:355 |
| `POST` | `/api/messages/conversations/find-or-create` | 🔒 auth | routes/messages.ts:358 |
| `POST` | `/api/messages/conversations` | 🔒 auth | routes/messages.ts:413 |
| `PUT` | `/api/messages/conversations/:id` | 🔒 auth | routes/messages.ts:439 |
| `GET` | `/api/messages/conversations/:convId/messages` | 🔒 auth | routes/messages.ts:463 |
| `POST` | `/api/messages/conversations/:convId/messages` | 🔒 auth | routes/messages.ts:484 |
| `PUT` | `/api/messages/messages/:id` | 🔒 auth | routes/messages.ts:597 |
| `DELETE` | `/api/messages/messages/:id` | 🔒 auth | routes/messages.ts:598 |
| `DELETE` | `/api/messages/messages/:id/for-me` | 🔒 auth | routes/messages.ts:599 |
| `DELETE` | `/api/messages/conversations/:id/history` | 🔒 auth | routes/messages.ts:602 |
| `POST` | `/api/messages/conversations/:id/leave` | 🔒 auth | routes/messages.ts:604 |
| `POST` | `/api/messages/conversations/:id/members` | 🔒 auth | routes/messages.ts:632 |
| `DELETE` | `/api/messages/conversations/:id/members/:userId` | 🔒 auth | routes/messages.ts:649 |
| `DELETE` | `/api/messages/conversations/:id` | 🔒 auth | routes/messages.ts:660 |
| `PUT` | `/api/messages/presence` | 🔒 auth | routes/messages.ts:673 |
| `GET` | `/api/messages/presence/:userId` | 🔒 auth | routes/messages.ts:690 |
| `PUT` | `/api/messages/presence/settings` | 🔒 auth | routes/messages.ts:716 |
| `POST` | `/api/messages/block/:targetId` | 🔒 auth | routes/messages.ts:752 |
| `DELETE` | `/api/messages/block/:targetId` | 🔒 auth | routes/messages.ts:753 |
| `GET` | `/api/messages/block/:targetId` | 🔒 auth | routes/messages.ts:758 |
| `POST` | `/api/messages/messages/:id/forward` | 🔒 auth | routes/messages.ts:791 |
| `POST` | `/api/messages/inquiry` | 🔒 auth | routes/messages.ts:795 |
| `POST` | `/api/messages/messages/:id/reactions` | 🔒 auth | routes/messages.ts:850 |
| `DELETE` | `/api/messages/messages/:id/reactions` | 🔒 auth | routes/messages.ts:877 |
| `GET` | `/api/messages/messages/:id/reactions` | 🔒 auth | routes/messages.ts:904 |
| `GET` | `/api/messages/search` | 🔒 auth | routes/messages.ts:934 |
| `POST` | `/api/messages/messages/:id/pin` | 🔒 auth | routes/messages.ts:1084 |
| `DELETE` | `/api/messages/messages/:id/pin` | 🔒 auth | routes/messages.ts:1110 |
| `GET` | `/api/messages/conversations/:convId/pins` | 🔒 auth | routes/messages.ts:1132 |
| `POST` | `/api/messages/saved/:id` | 🔒 auth | routes/messages.ts:1153 |
| `DELETE` | `/api/messages/saved/:id` | 🔒 auth | routes/messages.ts:1170 |
| `GET` | `/api/messages/saved` | 🔒 auth | routes/messages.ts:1182 |
| `POST` | `/api/messages/share-product` | 🔒 auth | routes/messages.ts:1203 |
| `PUT` | `/api/messages/:id` | 🔒 auth | routes/messages.ts:1256 |
| `DELETE` | `/api/messages/:id` | 🔒 auth | routes/messages.ts:1257 |
| `DELETE` | `/api/messages/:id/for-me` | 🔒 auth | routes/messages.ts:1258 |
| `POST` | `/api/messages/:id/forward` | 🔒 auth | routes/messages.ts:1259 |

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
| `GET` | `/api/orders/` | 🔒 auth | routes/orders.ts:89 |
| `GET` | `/api/orders/session/:sessionId` | 🔒 auth | routes/orders.ts:118 |
| `GET` | `/api/orders/:id` | 🔒 auth | routes/orders.ts:126 |
| `POST` | `/api/orders/` | 🔒 auth | routes/orders.ts:181 |
| `PUT` | `/api/orders/:id` | 🔒 auth | routes/orders.ts:259 |
| `POST` | `/api/orders/checkout/session` | 🔒 auth | routes/orders.ts:329 |
| `POST` | `/api/orders/webhook` | 🌐 public | routes/orders.ts:643 |
| `POST` | `/api/orders/checkout/chapa` | 🔒 auth | routes/orders.ts:677 |
| `GET` | `/api/orders/chapa/sandbox` | 🌐 public | routes/orders.ts:745 |
| `GET` | `/api/orders/chapa/status/:tx_ref` | 🌐 public | routes/orders.ts:757 |
| `GET` | `/api/orders/chapa/verify/:tx_ref` | 🌐 public | routes/orders.ts:768 |

## polls — polls

| Method | Path | Auth | Source |
|---|---|---|---|
| `POST` | `/api/polls/:postId/vote` | 🔒 auth | routes/polls.ts:9 |
| `GET` | `/api/polls/:postId/results` | ⚪ optional | routes/polls.ts:44 |

## posts — Social feed posts

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/posts/` | ⚪ optional | routes/posts.ts:59 |
| `GET` | `/api/posts/:id` | ⚪ optional | routes/posts.ts:144 |
| `POST` | `/api/posts/` | 🔒 auth | routes/posts.ts:155 |
| `PUT` | `/api/posts/:id` | 🔒 auth | routes/posts.ts:222 |
| `DELETE` | `/api/posts/:id` | 🔒 auth | routes/posts.ts:256 |
| `GET` | `/api/posts/:id/like` | ⚪ optional | routes/posts.ts:277 |
| `POST` | `/api/posts/:id/like` | 🔒 auth | routes/posts.ts:285 |
| `PUT` | `/api/posts/:id/reaction` | 🔒 auth | routes/posts.ts:332 |
| `DELETE` | `/api/posts/:id/reaction` | 🔒 auth | routes/posts.ts:362 |
| `GET` | `/api/posts/:id/reactions` | 🔒 auth | routes/posts.ts:372 |
| `POST` | `/api/posts/:id/hide` | 🔒 auth | routes/posts.ts:392 |
| `DELETE` | `/api/posts/:id/hide` | 🔒 auth | routes/posts.ts:399 |
| `PUT` | `/api/posts/:id/settings` | 🔒 auth | routes/posts.ts:408 |
| `GET` | `/api/posts/:id/comments` | ⚪ optional | routes/posts.ts:447 |
| `POST` | `/api/posts/:id/comments` | 🔒 auth | routes/posts.ts:472 |
| `DELETE` | `/api/posts/:postId/comments/:commentId` | 🔒 auth | routes/posts.ts:527 |
| `PUT` | `/api/posts/:postId/comments/:commentId` | 🔒 auth | routes/posts.ts:542 |
| `PUT` | `/api/posts/:postId/comments/:commentId/reaction` | 🔒 auth | routes/posts.ts:555 |
| `DELETE` | `/api/posts/:postId/comments/:commentId/reaction` | 🔒 auth | routes/posts.ts:573 |

## products — Marketplace products

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/products/` | ⚪ optional | routes/products.ts:71 |
| `GET` | `/api/products/mine` | 🔒 auth | routes/products.ts:175 |
| `GET` | `/api/products/lookup/:code` | 🔒 auth | routes/products.ts:195 |
| `POST` | `/api/products/import-image` | 🔒 auth | routes/products.ts:209 |
| `POST` | `/api/products/scan-batch` | 🔒 auth | routes/products.ts:225 |
| `GET` | `/api/products/:id` | ⚪ optional | routes/products.ts:287 |
| `POST` | `/api/products/` | 🔒 auth | routes/products.ts:310 |
| `PUT` | `/api/products/:id` | 🔒 auth | routes/products.ts:350 |
| `DELETE` | `/api/products/:id` | 🔒 auth | routes/products.ts:433 |
| `POST` | `/api/products/bulk-import` | 🔒 auth | routes/products.ts:445 |

## profilePartnerships — profilePartnerships

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/profile-partnerships/mine` | 🔒 auth | routes/profilePartnerships.ts:60 |
| `GET` | `/api/profile-partnerships/business/:businessId/products` | 🔒 auth | routes/profilePartnerships.ts:73 |
| `GET` | `/api/profile-partnerships/profile/:userId` | ⚪ optional | routes/profilePartnerships.ts:90 |
| `POST` | `/api/profile-partnerships/` | 🔒 auth | routes/profilePartnerships.ts:118 |
| `PUT` | `/api/profile-partnerships/:id/accept` | 🔒 auth | routes/profilePartnerships.ts:164 |
| `PUT` | `/api/profile-partnerships/:id/decline` | 🔒 auth | routes/profilePartnerships.ts:174 |
| `PUT` | `/api/profile-partnerships/:id/terminate` | 🔒 auth | routes/profilePartnerships.ts:184 |
| `GET` | `/api/profile-partnerships/my-commissions` | 🔒 auth | routes/profilePartnerships.ts:194 |
| `GET` | `/api/profile-partnerships/payouts` | 🔒 auth | routes/profilePartnerships.ts:224 |
| `POST` | `/api/profile-partnerships/:id/payouts` | 🔒 auth | routes/profilePartnerships.ts:246 |

## profiles — profiles

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/profiles/me` | 🔒 auth | routes/profiles.ts:130 |
| `GET` | `/api/profiles/by-user/:userId` | ⚪ optional | routes/profiles.ts:138 |
| `GET` | `/api/profiles/me/follows` | 🔒 auth | routes/profiles.ts:152 |
| `GET` | `/api/profiles/follows` | 🔒 auth | routes/profiles.ts:159 |
| `GET` | `/api/profiles/:id` | ⚪ optional | routes/profiles.ts:166 |
| `GET` | `/api/profiles/` | ⚪ optional | routes/profiles.ts:185 |
| `POST` | `/api/profiles/` | 🔒 auth | routes/profiles.ts:228 |
| `PUT` | `/api/profiles/me/upsert` | 🔒 auth | routes/profiles.ts:245 |
| `PUT` | `/api/profiles/:id` | 🔒 auth | routes/profiles.ts:265 |
| `PATCH` | `/api/profiles/me/ticker` | 🔒 auth | routes/profiles.ts:283 |
| `POST` | `/api/profiles/follow/:targetUserId` | 🔒 auth | routes/profiles.ts:309 |

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
| `GET` | `/api/referral/my-code` | 🔒 auth | routes/referral.ts:13 |

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
| `GET` | `/api/reviews/` | ⚪ optional | routes/reviews.ts:10 |
| `GET` | `/api/reviews/product/:productId` | ⚪ optional | routes/reviews.ts:36 |
| `POST` | `/api/reviews/` | 🔒 auth | routes/reviews.ts:53 |
| `DELETE` | `/api/reviews/:id` | 🔒 auth | routes/reviews.ts:86 |

## saves — saves

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/saves/` | 🔒 auth | routes/saves.ts:8 |
| `POST` | `/api/saves/toggle` | 🔒 auth | routes/saves.ts:64 |
| `GET` | `/api/saves/check/:targetId` | 🔒 auth | routes/saves.ts:79 |

## search — Cross-entity full-text search

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/search/` | ⚪ optional | routes/search.ts:46 |

## sharePreview — Link-preview data for shared business and product links.

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/share-preview/showroom/:slug` | 🌐 public | routes/sharePreview.ts:43 |
| `GET` | `/api/share-preview/product/:id` | 🌐 public | routes/sharePreview.ts:61 |

## showrooms — showrooms

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/showrooms/` | ⚪ optional | routes/showrooms.ts:18 |
| `GET` | `/api/showrooms/slug/:slug` | ⚪ optional | routes/showrooms.ts:46 |
| `POST` | `/api/showrooms/:id/recheck/:sectionKey` | 🔒 auth | routes/showrooms.ts:64 |
| `GET` | `/api/showrooms/:id/doctor` | 🔒 auth | routes/showrooms.ts:89 |
| `GET` | `/api/showrooms/sitemap-data` | 🌐 public | routes/showrooms.ts:146 |
| `POST` | `/api/showrooms/:id/newsletter` | ⚪ optional | routes/showrooms.ts:166 |
| `GET` | `/api/showrooms/:id/newsletter` | 🔒 auth | routes/showrooms.ts:184 |
| `PATCH` | `/api/showrooms/:id/spotlight` | 🔒 auth | routes/showrooms.ts:197 |
| `GET` | `/api/showrooms/:id` | ⚪ optional | routes/showrooms.ts:232 |
| `POST` | `/api/showrooms/` | 🔒 auth | routes/showrooms.ts:245 |
| `PUT` | `/api/showrooms/:id` | 🔒 auth | routes/showrooms.ts:311 |
| `DELETE` | `/api/showrooms/:id` | 🔒 auth | routes/showrooms.ts:372 |

## social — how you relate to another person, and your privacy.

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/social/relationship/:userId` | 🔒 auth | routes/social.ts:34 |
| `PUT` | `/api/social/mute/:userId` | 🔒 auth | routes/social.ts:73 |
| `DELETE` | `/api/social/mute/:userId` | 🔒 auth | routes/social.ts:74 |
| `PUT` | `/api/social/restrict/:userId` | 🔒 auth | routes/social.ts:77 |
| `DELETE` | `/api/social/restrict/:userId` | 🔒 auth | routes/social.ts:78 |
| `PUT` | `/api/social/block/:userId` | 🔒 auth | routes/social.ts:81 |
| `DELETE` | `/api/social/block/:userId` | 🔒 auth | routes/social.ts:106 |
| `GET` | `/api/social/people` | 🔒 auth | routes/social.ts:116 |
| `GET` | `/api/social/privacy` | 🔒 auth | routes/social.ts:146 |
| `PUT` | `/api/social/privacy` | 🔒 auth | routes/social.ts:154 |

## stories — stories

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/stories/` | ⚪ optional | routes/stories.ts:16 |
| `GET` | `/api/stories/user/:userId` | ⚪ optional | routes/stories.ts:30 |
| `POST` | `/api/stories/` | 🔒 auth | routes/stories.ts:43 |
| `POST` | `/api/stories/:id/view` | 🔒 auth | routes/stories.ts:55 |
| `POST` | `/api/stories/:id/reactions` | 🔒 auth | routes/stories.ts:63 |
| `GET` | `/api/stories/:id/comments` | 🔒 auth | routes/stories.ts:78 |
| `POST` | `/api/stories/:id/comments` | 🔒 auth | routes/stories.ts:85 |
| `DELETE` | `/api/stories/:id` | 🔒 auth | routes/stories.ts:103 |

## subscriptions — Business subscription lifecycle

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/subscriptions/plans` | 🌐 public | routes/subscriptions.ts:87 |
| `GET` | `/api/subscriptions/my` | 🔒 auth | routes/subscriptions.ts:123 |
| `POST` | `/api/subscriptions/create` | 🔒 auth | routes/subscriptions.ts:158 |
| `POST` | `/api/subscriptions/cancel` | 🔒 auth | routes/subscriptions.ts:258 |
| `POST` | `/api/subscriptions/webhook` | 🌐 public | routes/subscriptions.ts:302 |

## subscriptionsEtb — Prepaid ETB subscriptions through Chapa (Phase 1).

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/subscriptions/quote` | 🌐 public | routes/subscriptionsEtb.ts:56 |
| `POST` | `/api/subscriptions/checkout` | 🌐 public | routes/subscriptionsEtb.ts:65 |
| `POST` | `/api/subscriptions/webhook/chapa` | 🌐 public | routes/subscriptionsEtb.ts:82 |
| `GET` | `/api/subscriptions/chapa/callback` | 🌐 public | routes/subscriptionsEtb.ts:105 |
| `GET` | `/api/subscriptions/payments` | 🌐 public | routes/subscriptionsEtb.ts:127 |
| `GET` | `/api/subscriptions/payments/:ref/status` | 🌐 public | routes/subscriptionsEtb.ts:137 |
| `GET` | `/api/subscriptions/payments/:id/receipt` | 🌐 public | routes/subscriptionsEtb.ts:154 |
| `GET` | `/api/subscriptions/chapa/sandbox` | 🌐 public | routes/subscriptionsEtb.ts:172 |
| `POST` | `/api/subscriptions/chapa/sandbox/pay` | 🌐 public | routes/subscriptionsEtb.ts:189 |

## suggestions — suggestions

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/suggestions/people` | 🔒 auth | routes/suggestions.ts:9 |
| `POST` | `/api/suggestions/dismiss/:targetUserId` | 🔒 auth | routes/suggestions.ts:74 |

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
| `GET` | `/api/trending/` | ⚪ optional | routes/trending.ts:53 |
| `GET` | `/api/trending/warm` | ⚪ optional | routes/trending.ts:75 |

## upload — upload

| Method | Path | Auth | Source |
|---|---|---|---|
| `POST` | `/api/upload/` | 🔒 auth | routes/upload.ts:10 |

## variants — variants

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/variants/product/:productId` | ⚪ optional | routes/variants.ts:21 |
| `POST` | `/api/variants/product/:productId` | 🔒 auth | routes/variants.ts:39 |
| `PUT` | `/api/variants/:id` | 🔒 auth | routes/variants.ts:54 |
| `DELETE` | `/api/variants/:id` | 🔒 auth | routes/variants.ts:69 |

## verification — verification

| Method | Path | Auth | Source |
|---|---|---|---|
| `POST` | `/api/verification/request` | 🔒 auth | routes/verification.ts:13 |
| `GET` | `/api/verification/status` | 🔒 auth | routes/verification.ts:51 |
| `GET` | `/api/verification/my-request` | 🔒 auth | routes/verification.ts:71 |
| `GET` | `/api/verification/` | 👑 admin | routes/verification.ts:81 |
| `PUT` | `/api/verification/:id/approve` | 👑 admin | routes/verification.ts:94 |
| `PUT` | `/api/verification/:id/reject` | 👑 admin | routes/verification.ts:109 |

## wallet — Wallet management

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/wallet/me` | 🔒 auth | routes/wallet.ts:87 |
| `POST` | `/api/wallet/topup` | 🔒 auth | routes/wallet.ts:98 |
| `POST` | `/api/wallet/withdraw` | 🔒 auth | routes/wallet.ts:111 |
| `POST` | `/api/wallet/debit` | 🔒 auth | routes/wallet.ts:124 |
| `POST` | `/api/wallet/refund` | 🔒 auth | routes/wallet.ts:137 |
| `POST` | `/api/wallet/topup/chapa` | 🔒 auth | routes/wallet.ts:152 |
| `GET` | `/api/wallet/topup/chapa/sandbox` | 🌐 public | routes/wallet.ts:189 |
| `GET` | `/api/wallet/topup/chapa/verify/:tx_ref` | 🌐 public | routes/wallet.ts:203 |
| `POST` | `/api/wallet/topup/stripe` | 🔒 auth | routes/wallet.ts:271 |

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