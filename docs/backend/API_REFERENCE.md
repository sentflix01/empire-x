# Nodbusiness — API Reference

> **AUTO-GENERATED** from the route sources by `backend/scripts/generate-api-docs.js`.
> Do not hand-edit. After any route change run `npm run docs:api` (in `backend/`)
> and commit the regenerated file in the same PR.
> Endpoints: **371** across **53** mounted modules · Generated: 2026-11-12

| Legend | Meaning |
|---|---|
| 🔒 auth | Valid access token required (`requireAuth`) |
| 👑 admin | Admin role required (`requireAuth` + `requireAdmin`) |
| ⚪ optional | Token personalizes the response when present |
| 🌐 public | No token required |

Standard error shape: `{ "error": string, "code": string, "request_id"?: string }`
with `422 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`, `500 INTERNAL_ERROR`. Every response also carries `API-Version: 1`.

Sign-in failures (`requireAuth`, `requireAdmin`) use the same shape with these codes: `401 UNAUTHORIZED` (no token), `401 INVALID_TOKEN`, `401 TOKEN_EXPIRED` (refresh and retry), `401 TOKEN_REVOKED`, `401 USER_NOT_FOUND`, `403 ACCOUNT_SUSPENDED`, `403 ADMIN_REQUIRED`, `403 MFA_SETUP_REQUIRED`.

## Contents
- [`admin`](#admin) (19)
- [`ai`](#ai) (4)
- [`auth`](#auth) (21)
- [`businessApiKeys`](#businessapikeys) (3)
- [`businesses`](#businesses) (10)
- [`businessWebhooks`](#businesswebhooks) (4)
- [`cart`](#cart) (5)
- [`commission`](#commission) (2)
- [`coupons`](#coupons) (6)
- [`delivery`](#delivery) (2)
- [`devops`](#devops) (18)
- [`directOrders`](#directorders) (12)
- [`docs`](#docs) (1)
- [`externalSources`](#externalsources) (9)
- [`feed`](#feed) (1)
- [`flags`](#flags) (4)
- [`friends`](#friends) (1)
- [`hashtags`](#hashtags) (3)
- [`internalJobs`](#internaljobs) (1)
- [`locations`](#locations) (2)
- [`maps`](#maps) (2)
- [`messages`](#messages) (49)
- [`mfa`](#mfa) (5)
- [`moderation`](#moderation) (3)
- [`notifications`](#notifications) (7)
- [`orders`](#orders) (11)
- [`polls`](#polls) (2)
- [`posts`](#posts) (19)
- [`privateFiles`](#privatefiles) (1)
- [`products`](#products) (10)
- [`profilePartnerships`](#profilepartnerships) (10)
- [`profiles`](#profiles) (11)
- [`proxy`](#proxy) (1)
- [`push`](#push) (3)
- [`referral`](#referral) (1)
- [`returns`](#returns) (6)
- [`reviews`](#reviews) (4)
- [`saves`](#saves) (4)
- [`search`](#search) (1)
- [`sharePreview`](#sharepreview) (2)
- [`showrooms`](#showrooms) (12)
- [`social`](#social) (10)
- [`stories`](#stories) (8)
- [`subscriptions`](#subscriptions) (5)
- [`subscriptionsEtb`](#subscriptionsetb) (9)
- [`suggestions`](#suggestions) (2)
- [`telegram`](#telegram) (6)
- [`trending`](#trending) (2)
- [`upload`](#upload) (2)
- [`variants`](#variants) (4)
- [`verification`](#verification) (8)
- [`wallet`](#wallet) (9)
- [`wishlists`](#wishlists) (14)


## admin — admin

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/admin/stats` | 👑 admin | routes/admin.ts:25 |
| `GET` | `/api/admin/users` | 👑 admin | routes/admin.ts:53 |
| `PUT` | `/api/admin/users/:id/role` | 👑 admin | routes/admin.ts:86 |
| `DELETE` | `/api/admin/users/:id` | 👑 admin | routes/admin.ts:107 |
| `POST` | `/api/admin/users/:id/ban` | 👑 admin | routes/admin.ts:135 |
| `POST` | `/api/admin/users/:id/unban` | 👑 admin | routes/admin.ts:161 |
| `GET` | `/api/admin/verifications` | 👑 admin | routes/admin.ts:174 |
| `POST` | `/api/admin/verifications/:userId` | 👑 admin | routes/admin.ts:189 |
| `DELETE` | `/api/admin/verifications/:userId` | 👑 admin | routes/admin.ts:208 |
| `GET` | `/api/admin/posts` | 👑 admin | routes/admin.ts:220 |
| `DELETE` | `/api/admin/posts/:id` | 👑 admin | routes/admin.ts:234 |
| `GET` | `/api/admin/products` | 👑 admin | routes/admin.ts:247 |
| `DELETE` | `/api/admin/products/:id` | 👑 admin | routes/admin.ts:261 |
| `GET` | `/api/admin/orders` | 👑 admin | routes/admin.ts:267 |
| `GET` | `/api/admin/reports` | 👑 admin | routes/admin.ts:282 |
| `PUT` | `/api/admin/reports/:id` | 👑 admin | routes/admin.ts:291 |
| `PUT` | `/api/admin/users/:id/verify` | 👑 admin | routes/admin.ts:299 |
| `GET` | `/api/admin/stats/revenue` | 👑 admin | routes/admin.ts:307 |
| `GET` | `/api/admin/audit-logs` | 👑 admin | routes/admin.ts:327 |

## ai — ai

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/ai/status` | 🌐 public | routes/ai.ts:50 |
| `POST` | `/api/ai/generate` | 🔒 auth | routes/ai.ts:54 |
| `POST` | `/api/ai/generate-description` | 🔒 auth | routes/ai.ts:90 |
| `POST` | `/api/ai/chat` | 🔒 auth | routes/ai.ts:111 |

## auth — Authentication endpoints

| Method | Path | Auth | Source |
|---|---|---|---|
| `POST` | `/api/auth/register` | 🌐 public | routes/auth.ts:240 |
| `POST` | `/api/auth/verify-otp` | 🌐 public | routes/auth.ts:335 |
| `POST` | `/api/auth/resend-otp` | 🌐 public | routes/auth.ts:427 |
| `POST` | `/api/auth/demo` | 🌐 public | routes/auth.ts:464 |
| `POST` | `/api/auth/demo/exit` | 🌐 public | routes/auth.ts:533 |
| `POST` | `/api/auth/demo/reset` | 🌐 public | routes/auth.ts:553 |
| `POST` | `/api/auth/workspace` | 🔒 auth | routes/auth.ts:571 |
| `POST` | `/api/auth/onboarding-mode` | 🌐 public | routes/auth.ts:577 |
| `POST` | `/api/auth/login` | 🌐 public | routes/auth.ts:584 |
| `POST` | `/api/auth/mfa/verify` | 🌐 public | routes/auth.ts:703 |
| `POST` | `/api/auth/google` | 🌐 public | routes/auth.ts:766 |
| `GET` | `/api/auth/me` | 🔒 auth | routes/auth.ts:921 |
| `GET` | `/api/auth/me/export` | 🔒 auth | routes/auth.ts:966 |
| `DELETE` | `/api/auth/me` | 🔒 auth | routes/auth.ts:979 |
| `POST` | `/api/auth/forgot-password` | 🌐 public | routes/auth.ts:1034 |
| `POST` | `/api/auth/reset-password` | 🌐 public | routes/auth.ts:1070 |
| `PUT` | `/api/auth/update-name` | 🔒 auth | routes/auth.ts:1121 |
| `PUT` | `/api/auth/change-password` | 🔒 auth | routes/auth.ts:1143 |
| `POST` | `/api/auth/refresh` | 🌐 public | routes/auth.ts:1182 |
| `POST` | `/api/auth/logout` | 🌐 public | routes/auth.ts:1265 |
| `POST` | `/api/auth/logout-all` | 🔒 auth | routes/auth.ts:1305 |

## businessApiKeys — Business API key management

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/business-api-keys/` | 🔒 auth | routes/businessApiKeys.ts:42 |
| `POST` | `/api/business-api-keys/` | 🔒 auth | routes/businessApiKeys.ts:68 |
| `DELETE` | `/api/business-api-keys/:id` | 🔒 auth | routes/businessApiKeys.ts:107 |

## businesses — businesses

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/businesses/` | ⚪ optional | routes/businesses.ts:36 |
| `GET` | `/api/businesses/:id` | ⚪ optional | routes/businesses.ts:54 |
| `POST` | `/api/businesses/` | 🔒 auth | routes/businesses.ts:66 |
| `PUT` | `/api/businesses/:id` | 🔒 auth | routes/businesses.ts:87 |
| `DELETE` | `/api/businesses/:id` | 🔒 auth | routes/businesses.ts:100 |
| `GET` | `/api/businesses/:id/payment-accounts` | 🔒 auth | routes/businesses.ts:157 |
| `POST` | `/api/businesses/:id/payment-accounts` | 🔒 auth | routes/businesses.ts:165 |
| `PUT` | `/api/businesses/:id/payment-accounts/:accountId` | 🔒 auth | routes/businesses.ts:182 |
| `DELETE` | `/api/businesses/:id/payment-accounts/:accountId` | 🔒 auth | routes/businesses.ts:200 |
| `GET` | `/api/businesses/:id/checkout-info` | ⚪ optional | routes/businesses.ts:213 |

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
| `POST` | `/api/coupons/` | 🔒 auth | routes/coupons.ts:9 |
| `GET` | `/api/coupons/mine` | 🔒 auth | routes/coupons.ts:38 |
| `POST` | `/api/coupons/validate` | 🌐 public | routes/coupons.ts:45 |
| `POST` | `/api/coupons/use` | 🔒 auth | routes/coupons.ts:75 |
| `PATCH` | `/api/coupons/:id/toggle` | 🔒 auth | routes/coupons.ts:81 |
| `DELETE` | `/api/coupons/:id` | 🔒 auth | routes/coupons.ts:91 |

## delivery — delivery

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/delivery/order/:orderId` | 🔒 auth | routes/delivery.ts:12 |
| `POST` | `/api/delivery/` | 🔒 auth | routes/delivery.ts:43 |

## devops — devops

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/devops/` | 👑 admin | routes/devops.ts:14 |
| `POST` | `/api/devops/` | 👑 admin | routes/devops.ts:21 |
| `PUT` | `/api/devops/:id` | 👑 admin | routes/devops.ts:38 |
| `DELETE` | `/api/devops/:id` | 👑 admin | routes/devops.ts:57 |
| `GET` | `/api/devops/errors` | 👑 admin | routes/devops.ts:74 |
| `GET` | `/api/devops/errors/stats` | 👑 admin | routes/devops.ts:102 |
| `PATCH` | `/api/devops/errors/:id/resolve` | 👑 admin | routes/devops.ts:135 |
| `PUT` | `/api/devops/errors/:id/resolve` | 👑 admin | routes/devops.ts:136 |
| `PATCH` | `/api/devops/errors/resolve-all` | 👑 admin | routes/devops.ts:138 |
| `POST` | `/api/devops/errors/:id/to-ticket` | 👑 admin | routes/devops.ts:154 |
| `POST` | `/api/devops/errors/report` | ⚪ optional | routes/devops.ts:193 |
| `GET` | `/api/devops/versions` | 👑 admin | routes/devops.ts:209 |
| `PUT` | `/api/devops/versions` | 👑 admin | routes/devops.ts:216 |
| `PUT` | `/api/devops/versions/:version` | 👑 admin | routes/devops.ts:229 |
| `GET` | `/api/devops/health-summary` | 👑 admin | routes/devops.ts:252 |
| `GET` | `/api/devops/telemetry` | 👑 admin | routes/devops.ts:287 |
| `POST` | `/api/devops/copilot` | 👑 admin | routes/devops.ts:426 |
| `GET` | `/api/devops/scorecard` | 👑 admin | routes/devops.ts:449 |

## directOrders — Buy by paying the seller directly (guest or signed in).

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/direct-orders/checkout-info` | ⚪ optional | routes/directOrders.ts:144 |
| `POST` | `/api/direct-orders/requests` | ⚪ optional | routes/directOrders.ts:238 |
| `POST` | `/api/direct-orders/` | ⚪ optional | routes/directOrders.ts:310 |
| `GET` | `/api/direct-orders/link/:token` | 🌐 public | routes/directOrders.ts:422 |
| `POST` | `/api/direct-orders/link/:token/report-payment` | 🌐 public | routes/directOrders.ts:457 |
| `POST` | `/api/direct-orders/:id/report-payment` | 🔒 auth | routes/directOrders.ts:465 |
| `POST` | `/api/direct-orders/:id/confirm-payment` | 🔒 auth | routes/directOrders.ts:475 |
| `POST` | `/api/direct-orders/:id/reject-payment` | 🔒 auth | routes/directOrders.ts:492 |
| `POST` | `/api/direct-orders/:id/set-price` | 🔒 auth | routes/directOrders.ts:511 |
| `POST` | `/api/direct-orders/:id/decline-request` | 🔒 auth | routes/directOrders.ts:540 |
| `GET` | `/api/direct-orders/link/:token/receipt` | 🌐 public | routes/directOrders.ts:564 |
| `GET` | `/api/direct-orders/:id/receipt` | 🔒 auth | routes/directOrders.ts:572 |

## docs — docs

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/docs/` | 🌐 public | routes/docs.ts:6 |

## externalSources — External Data Sources

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/showrooms/:showroomId/external-sources/health` | 🔒 auth | routes/externalSources.ts:103 |
| `GET` | `/api/showrooms/:showroomId/external-sources/` | 🔒 auth | routes/externalSources.ts:127 |
| `POST` | `/api/showrooms/:showroomId/external-sources/` | 🔒 auth | routes/externalSources.ts:139 |
| `PUT` | `/api/showrooms/:showroomId/external-sources/:sourceId` | 🔒 auth | routes/externalSources.ts:162 |
| `DELETE` | `/api/showrooms/:showroomId/external-sources/:sourceId` | 🔒 auth | routes/externalSources.ts:187 |
| `GET` | `/api/showrooms/:showroomId/external-sources/:sourceId/mappings` | 🔒 auth | routes/externalSources.ts:202 |
| `POST` | `/api/showrooms/:showroomId/external-sources/:sourceId/mappings` | 🔒 auth | routes/externalSources.ts:212 |
| `DELETE` | `/api/showrooms/:showroomId/external-sources/:sourceId/mappings/:mappingId` | 🔒 auth | routes/externalSources.ts:228 |
| `POST` | `/api/showrooms/:showroomId/external-sources/:sourceId/refresh` | 🔒 auth | routes/externalSources.ts:240 |

## feed — The Business feed, built on the server.

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/feed/businesses` | ⚪ optional | routes/feed.ts:46 |

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
| `GET` | `/api/friends/mutual` | 🔒 auth | routes/friends.ts:9 |

## hashtags — hashtags

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/hashtags/trending` | 🌐 public | routes/hashtags.ts:48 |
| `GET` | `/api/hashtags/:name` | ⚪ optional | routes/hashtags.ts:68 |
| `GET` | `/api/hashtags/:name/posts` | ⚪ optional | routes/hashtags.ts:92 |

## internalJobs — run scheduled jobs on request.

| Method | Path | Auth | Source |
|---|---|---|---|
| `POST` | `/api/internal/jobs/:name` | 🌐 public | routes/internalJobs.ts:55 |

## locations — Live GPS location for Enterprise businesses

| Method | Path | Auth | Source |
|---|---|---|---|
| `POST` | `/api/locations/update` | 🔒 auth | routes/locations.ts:34 |
| `GET` | `/api/locations/:businessId` | ⚪ optional | routes/locations.ts:108 |

## maps — maps

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/maps/nearby/product-search` | ⚪ optional | routes/maps.ts:39 |
| `GET` | `/api/maps/nearby` | ⚪ optional | routes/maps.ts:119 |

## messages — Conversations and real-time messaging

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/messages/conversations` | 🔒 auth | routes/messages.ts:209 |
| `GET` | `/api/messages/unread-count` | 🔒 auth | routes/messages.ts:220 |
| `GET` | `/api/messages/conversations/:id` | 🔒 auth | routes/messages.ts:242 |
| `POST` | `/api/messages/conversations/:id/read` | 🔒 auth | routes/messages.ts:263 |
| `POST` | `/api/messages/delivered` | 🔒 auth | routes/messages.ts:297 |
| `PUT` | `/api/messages/conversations/:id/mute` | 🔒 auth | routes/messages.ts:319 |
| `PUT` | `/api/messages/conversations/:id/archive` | 🔒 auth | routes/messages.ts:336 |
| `POST` | `/api/messages/conversations/:id/accept` | 🔒 auth | routes/messages.ts:349 |
| `DELETE` | `/api/messages/conversations/:id/for-me` | 🔒 auth | routes/messages.ts:373 |
| `POST` | `/api/messages/conversations/find-or-create` | 🔒 auth | routes/messages.ts:376 |
| `POST` | `/api/messages/conversations/business` | 🔒 auth | routes/messages.ts:480 |
| `GET` | `/api/messages/quick-replies` | 🔒 auth | routes/messages.ts:498 |
| `PUT` | `/api/messages/quick-replies` | 🔒 auth | routes/messages.ts:507 |
| `POST` | `/api/messages/conversations` | 🔒 auth | routes/messages.ts:535 |
| `PUT` | `/api/messages/conversations/:id` | 🔒 auth | routes/messages.ts:561 |
| `GET` | `/api/messages/conversations/:convId/messages` | 🔒 auth | routes/messages.ts:586 |
| `POST` | `/api/messages/conversations/:convId/messages` | 🔒 auth | routes/messages.ts:607 |
| `PUT` | `/api/messages/messages/:id` | 🔒 auth | routes/messages.ts:698 |
| `DELETE` | `/api/messages/messages/:id` | 🔒 auth | routes/messages.ts:699 |
| `DELETE` | `/api/messages/messages/:id/for-me` | 🔒 auth | routes/messages.ts:700 |
| `DELETE` | `/api/messages/conversations/:id/history` | 🔒 auth | routes/messages.ts:703 |
| `POST` | `/api/messages/conversations/:id/leave` | 🔒 auth | routes/messages.ts:705 |
| `POST` | `/api/messages/conversations/:id/members` | 🔒 auth | routes/messages.ts:734 |
| `DELETE` | `/api/messages/conversations/:id/members/:userId` | 🔒 auth | routes/messages.ts:752 |
| `PUT` | `/api/messages/conversations/:id/members/:userId` | 🔒 auth | routes/messages.ts:766 |
| `DELETE` | `/api/messages/conversations/:id` | 🔒 auth | routes/messages.ts:792 |
| `PUT` | `/api/messages/presence` | 🔒 auth | routes/messages.ts:806 |
| `GET` | `/api/messages/presence/:userId` | 🔒 auth | routes/messages.ts:823 |
| `PUT` | `/api/messages/presence/settings` | 🔒 auth | routes/messages.ts:849 |
| `POST` | `/api/messages/block/:targetId` | 🔒 auth | routes/messages.ts:885 |
| `DELETE` | `/api/messages/block/:targetId` | 🔒 auth | routes/messages.ts:886 |
| `GET` | `/api/messages/block/:targetId` | 🔒 auth | routes/messages.ts:891 |
| `POST` | `/api/messages/messages/:id/forward` | 🔒 auth | routes/messages.ts:924 |
| `POST` | `/api/messages/inquiry` | 🔒 auth | routes/messages.ts:928 |
| `POST` | `/api/messages/messages/:id/reactions` | 🔒 auth | routes/messages.ts:998 |
| `DELETE` | `/api/messages/messages/:id/reactions` | 🔒 auth | routes/messages.ts:1023 |
| `GET` | `/api/messages/messages/:id/reactions` | 🔒 auth | routes/messages.ts:1050 |
| `GET` | `/api/messages/search` | 🔒 auth | routes/messages.ts:1080 |
| `POST` | `/api/messages/messages/:id/pin` | 🔒 auth | routes/messages.ts:1230 |
| `DELETE` | `/api/messages/messages/:id/pin` | 🔒 auth | routes/messages.ts:1256 |
| `GET` | `/api/messages/conversations/:convId/pins` | 🔒 auth | routes/messages.ts:1278 |
| `POST` | `/api/messages/saved/:id` | 🔒 auth | routes/messages.ts:1299 |
| `DELETE` | `/api/messages/saved/:id` | 🔒 auth | routes/messages.ts:1316 |
| `GET` | `/api/messages/saved` | 🔒 auth | routes/messages.ts:1328 |
| `POST` | `/api/messages/share-product` | 🔒 auth | routes/messages.ts:1349 |
| `PUT` | `/api/messages/:id` | 🔒 auth | routes/messages.ts:1402 |
| `DELETE` | `/api/messages/:id` | 🔒 auth | routes/messages.ts:1403 |
| `DELETE` | `/api/messages/:id/for-me` | 🔒 auth | routes/messages.ts:1404 |
| `POST` | `/api/messages/:id/forward` | 🔒 auth | routes/messages.ts:1405 |

## mfa — managing two-factor sign-in (audit F-017). Mounted at

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/auth/mfa/status` | 🔒 auth | routes/mfa.ts:47 |
| `POST` | `/api/auth/mfa/setup` | 🔒 auth | routes/mfa.ts:65 |
| `POST` | `/api/auth/mfa/enable` | 🔒 auth | routes/mfa.ts:86 |
| `POST` | `/api/auth/mfa/disable` | 🔒 auth | routes/mfa.ts:106 |
| `POST` | `/api/auth/mfa/recovery-codes` | 🔒 auth | routes/mfa.ts:132 |

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
| `GET` | `/api/notifications/unread-count` | 🔒 auth | routes/notifications.ts:87 |
| `POST` | `/api/notifications/` | 🔒 auth | routes/notifications.ts:99 |
| `PUT` | `/api/notifications/read-all` | 🔒 auth | routes/notifications.ts:118 |
| `POST` | `/api/notifications/mark-read` | 🔒 auth | routes/notifications.ts:125 |
| `PUT` | `/api/notifications/:id/read` | 🔒 auth | routes/notifications.ts:140 |
| `DELETE` | `/api/notifications/:id` | 🔒 auth | routes/notifications.ts:151 |

## orders — Orders, Stripe + Chapa payments, webhooks

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/orders/` | 🔒 auth | routes/orders.ts:94 |
| `GET` | `/api/orders/session/:sessionId` | 🔒 auth | routes/orders.ts:125 |
| `GET` | `/api/orders/:id` | 🔒 auth | routes/orders.ts:133 |
| `POST` | `/api/orders/` | 🔒 auth | routes/orders.ts:188 |
| `PUT` | `/api/orders/:id` | 🔒 auth | routes/orders.ts:266 |
| `POST` | `/api/orders/checkout/session` | 🔒 auth | routes/orders.ts:336 |
| `POST` | `/api/orders/webhook` | 🌐 public | routes/orders.ts:650 |
| `POST` | `/api/orders/checkout/chapa` | 🔒 auth | routes/orders.ts:684 |
| `GET` | `/api/orders/chapa/sandbox` | 🌐 public | routes/orders.ts:752 |
| `GET` | `/api/orders/chapa/status/:tx_ref` | 🔒 auth | routes/orders.ts:766 |
| `GET` | `/api/orders/chapa/verify/:tx_ref` | 🌐 public | routes/orders.ts:779 |

## polls — polls

| Method | Path | Auth | Source |
|---|---|---|---|
| `POST` | `/api/polls/:postId/vote` | 🔒 auth | routes/polls.ts:9 |
| `GET` | `/api/polls/:postId/results` | ⚪ optional | routes/polls.ts:44 |

## posts — Social feed posts

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/posts/` | ⚪ optional | routes/posts.ts:63 |
| `GET` | `/api/posts/:id` | ⚪ optional | routes/posts.ts:148 |
| `POST` | `/api/posts/` | 🔒 auth | routes/posts.ts:159 |
| `PUT` | `/api/posts/:id` | 🔒 auth | routes/posts.ts:226 |
| `DELETE` | `/api/posts/:id` | 🔒 auth | routes/posts.ts:260 |
| `GET` | `/api/posts/:id/like` | ⚪ optional | routes/posts.ts:281 |
| `POST` | `/api/posts/:id/like` | 🔒 auth | routes/posts.ts:289 |
| `PUT` | `/api/posts/:id/reaction` | 🔒 auth | routes/posts.ts:336 |
| `DELETE` | `/api/posts/:id/reaction` | 🔒 auth | routes/posts.ts:366 |
| `GET` | `/api/posts/:id/reactions` | 🔒 auth | routes/posts.ts:376 |
| `POST` | `/api/posts/:id/hide` | 🔒 auth | routes/posts.ts:396 |
| `DELETE` | `/api/posts/:id/hide` | 🔒 auth | routes/posts.ts:403 |
| `PUT` | `/api/posts/:id/settings` | 🔒 auth | routes/posts.ts:412 |
| `GET` | `/api/posts/:id/comments` | ⚪ optional | routes/posts.ts:451 |
| `POST` | `/api/posts/:id/comments` | 🔒 auth | routes/posts.ts:476 |
| `DELETE` | `/api/posts/:postId/comments/:commentId` | 🔒 auth | routes/posts.ts:531 |
| `PUT` | `/api/posts/:postId/comments/:commentId` | 🔒 auth | routes/posts.ts:546 |
| `PUT` | `/api/posts/:postId/comments/:commentId/reaction` | 🔒 auth | routes/posts.ts:559 |
| `DELETE` | `/api/posts/:postId/comments/:commentId/reaction` | 🔒 auth | routes/posts.ts:577 |

## privateFiles — GET /api/private-files/<key>?expires=…&signature=… — local development only.

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/private-files/*key` | 🌐 public | routes/privateFiles.ts:20 |

## products — Marketplace products

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/products/` | ⚪ optional | routes/products.ts:77 |
| `GET` | `/api/products/mine` | 🔒 auth | routes/products.ts:184 |
| `GET` | `/api/products/lookup/:code` | 🔒 auth | routes/products.ts:204 |
| `POST` | `/api/products/import-image` | 🔒 auth | routes/products.ts:218 |
| `POST` | `/api/products/scan-batch` | 🔒 auth | routes/products.ts:256 |
| `GET` | `/api/products/:id` | ⚪ optional | routes/products.ts:324 |
| `POST` | `/api/products/` | 🔒 auth | routes/products.ts:347 |
| `PUT` | `/api/products/:id` | 🔒 auth | routes/products.ts:402 |
| `DELETE` | `/api/products/:id` | 🔒 auth | routes/products.ts:485 |
| `POST` | `/api/products/bulk-import` | 🔒 auth | routes/products.ts:497 |

## profilePartnerships — profilePartnerships

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/profile-partnerships/mine` | 🔒 auth | routes/profilePartnerships.ts:64 |
| `GET` | `/api/profile-partnerships/business/:businessId/products` | 🔒 auth | routes/profilePartnerships.ts:77 |
| `GET` | `/api/profile-partnerships/profile/:userId` | ⚪ optional | routes/profilePartnerships.ts:94 |
| `POST` | `/api/profile-partnerships/` | 🔒 auth | routes/profilePartnerships.ts:122 |
| `PUT` | `/api/profile-partnerships/:id/accept` | 🔒 auth | routes/profilePartnerships.ts:168 |
| `PUT` | `/api/profile-partnerships/:id/decline` | 🔒 auth | routes/profilePartnerships.ts:178 |
| `PUT` | `/api/profile-partnerships/:id/terminate` | 🔒 auth | routes/profilePartnerships.ts:188 |
| `GET` | `/api/profile-partnerships/my-commissions` | 🔒 auth | routes/profilePartnerships.ts:198 |
| `GET` | `/api/profile-partnerships/payouts` | 🔒 auth | routes/profilePartnerships.ts:228 |
| `POST` | `/api/profile-partnerships/:id/payouts` | 🔒 auth | routes/profilePartnerships.ts:250 |

## profiles — profiles

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/profiles/me` | 🔒 auth | routes/profiles.ts:133 |
| `GET` | `/api/profiles/by-user/:userId` | ⚪ optional | routes/profiles.ts:141 |
| `GET` | `/api/profiles/me/follows` | 🔒 auth | routes/profiles.ts:155 |
| `GET` | `/api/profiles/follows` | 🔒 auth | routes/profiles.ts:162 |
| `GET` | `/api/profiles/:id` | ⚪ optional | routes/profiles.ts:169 |
| `GET` | `/api/profiles/` | ⚪ optional | routes/profiles.ts:188 |
| `POST` | `/api/profiles/` | 🔒 auth | routes/profiles.ts:231 |
| `PUT` | `/api/profiles/me/upsert` | 🔒 auth | routes/profiles.ts:248 |
| `PUT` | `/api/profiles/:id` | 🔒 auth | routes/profiles.ts:268 |
| `PATCH` | `/api/profiles/me/ticker` | 🔒 auth | routes/profiles.ts:286 |
| `POST` | `/api/profiles/follow/:targetUserId` | 🔒 auth | routes/profiles.ts:312 |

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
| `GET` | `/api/returns/` | 🔒 auth | routes/returns.ts:13 |
| `GET` | `/api/returns/seller` | 🔒 auth | routes/returns.ts:31 |
| `POST` | `/api/returns/` | 🔒 auth | routes/returns.ts:47 |
| `PUT` | `/api/returns/:id/approve` | 🔒 auth | routes/returns.ts:188 |
| `PUT` | `/api/returns/:id/reject` | 🔒 auth | routes/returns.ts:189 |
| `PUT` | `/api/returns/:id` | 🔒 auth | routes/returns.ts:190 |

## reviews — reviews

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/reviews/` | ⚪ optional | routes/reviews.ts:14 |
| `GET` | `/api/reviews/product/:productId` | ⚪ optional | routes/reviews.ts:40 |
| `POST` | `/api/reviews/` | 🔒 auth | routes/reviews.ts:57 |
| `DELETE` | `/api/reviews/:id` | 🔒 auth | routes/reviews.ts:90 |

## saves — saves

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/saves/` | 🔒 auth | routes/saves.ts:8 |
| `POST` | `/api/saves/toggle` | 🔒 auth | routes/saves.ts:64 |
| `GET` | `/api/saves/my-products` | 🔒 auth | routes/saves.ts:84 |
| `GET` | `/api/saves/check/:targetId` | 🔒 auth | routes/saves.ts:104 |

## search — Cross-entity full-text search

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/search/` | ⚪ optional | routes/search.ts:46 |

## sharePreview — Link-preview data for shared business and product links.

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/share-preview/showroom/:slug` | 🌐 public | routes/sharePreview.ts:46 |
| `GET` | `/api/share-preview/product/:id` | 🌐 public | routes/sharePreview.ts:64 |

## showrooms — showrooms

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/showrooms/` | ⚪ optional | routes/showrooms.ts:21 |
| `GET` | `/api/showrooms/slug/:slug` | ⚪ optional | routes/showrooms.ts:49 |
| `POST` | `/api/showrooms/:id/recheck/:sectionKey` | 🔒 auth | routes/showrooms.ts:67 |
| `GET` | `/api/showrooms/:id/doctor` | 🔒 auth | routes/showrooms.ts:92 |
| `GET` | `/api/showrooms/sitemap-data` | 🌐 public | routes/showrooms.ts:149 |
| `POST` | `/api/showrooms/:id/newsletter` | ⚪ optional | routes/showrooms.ts:169 |
| `GET` | `/api/showrooms/:id/newsletter` | 🔒 auth | routes/showrooms.ts:187 |
| `PATCH` | `/api/showrooms/:id/spotlight` | 🔒 auth | routes/showrooms.ts:200 |
| `GET` | `/api/showrooms/:id` | ⚪ optional | routes/showrooms.ts:238 |
| `POST` | `/api/showrooms/` | 🔒 auth | routes/showrooms.ts:251 |
| `PUT` | `/api/showrooms/:id` | 🔒 auth | routes/showrooms.ts:317 |
| `DELETE` | `/api/showrooms/:id` | 🔒 auth | routes/showrooms.ts:378 |

## social — how you relate to another person, and your privacy.

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/social/relationship/:userId` | 🔒 auth | routes/social.ts:35 |
| `PUT` | `/api/social/mute/:userId` | 🔒 auth | routes/social.ts:74 |
| `DELETE` | `/api/social/mute/:userId` | 🔒 auth | routes/social.ts:75 |
| `PUT` | `/api/social/restrict/:userId` | 🔒 auth | routes/social.ts:78 |
| `DELETE` | `/api/social/restrict/:userId` | 🔒 auth | routes/social.ts:79 |
| `PUT` | `/api/social/block/:userId` | 🔒 auth | routes/social.ts:82 |
| `DELETE` | `/api/social/block/:userId` | 🔒 auth | routes/social.ts:107 |
| `GET` | `/api/social/people` | 🔒 auth | routes/social.ts:117 |
| `GET` | `/api/social/privacy` | 🔒 auth | routes/social.ts:147 |
| `PUT` | `/api/social/privacy` | 🔒 auth | routes/social.ts:155 |

## stories — stories

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/stories/` | ⚪ optional | routes/stories.ts:20 |
| `GET` | `/api/stories/user/:userId` | ⚪ optional | routes/stories.ts:34 |
| `POST` | `/api/stories/` | 🔒 auth | routes/stories.ts:47 |
| `POST` | `/api/stories/:id/view` | 🔒 auth | routes/stories.ts:59 |
| `POST` | `/api/stories/:id/reactions` | 🔒 auth | routes/stories.ts:67 |
| `GET` | `/api/stories/:id/comments` | 🔒 auth | routes/stories.ts:82 |
| `POST` | `/api/stories/:id/comments` | 🔒 auth | routes/stories.ts:89 |
| `DELETE` | `/api/stories/:id` | 🔒 auth | routes/stories.ts:107 |

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
| `GET` | `/api/suggestions/people` | 🔒 auth | routes/suggestions.ts:10 |
| `POST` | `/api/suggestions/dismiss/:targetUserId` | 🔒 auth | routes/suggestions.ts:75 |

## telegram — telegram

| Method | Path | Auth | Source |
|---|---|---|---|
| `POST` | `/api/telegram/connect` | 🔒 auth | routes/telegram.ts:39 |
| `POST` | `/api/telegram/disconnect` | 🔒 auth | routes/telegram.ts:62 |
| `DELETE` | `/api/telegram/disconnect` | 🔒 auth | routes/telegram.ts:63 |
| `GET` | `/api/telegram/status` | 🔒 auth | routes/telegram.ts:65 |
| `PUT` | `/api/telegram/notifications` | 🔒 auth | routes/telegram.ts:79 |
| `POST` | `/api/telegram/test` | 🔒 auth | routes/telegram.ts:95 |

## trending — trending

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/trending/` | ⚪ optional | routes/trending.ts:54 |
| `GET` | `/api/trending/warm` | ⚪ optional | routes/trending.ts:76 |

## upload — upload

| Method | Path | Auth | Source |
|---|---|---|---|
| `POST` | `/api/upload/` | 🔒 auth | routes/upload.ts:74 |
| `POST` | `/api/upload/multiple` | 🔒 auth | routes/upload.ts:121 |

## variants — variants

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/variants/product/:productId` | ⚪ optional | routes/variants.ts:24 |
| `POST` | `/api/variants/product/:productId` | 🔒 auth | routes/variants.ts:42 |
| `PUT` | `/api/variants/:id` | 🔒 auth | routes/variants.ts:57 |
| `DELETE` | `/api/variants/:id` | 🔒 auth | routes/variants.ts:72 |

## verification — verification

| Method | Path | Auth | Source |
|---|---|---|---|
| `POST` | `/api/verification/documents` | 🔒 auth | routes/verification.ts:62 |
| `POST` | `/api/verification/request` | 🔒 auth | routes/verification.ts:79 |
| `GET` | `/api/verification/status` | 🔒 auth | routes/verification.ts:127 |
| `GET` | `/api/verification/my-request` | 🔒 auth | routes/verification.ts:147 |
| `GET` | `/api/verification/` | 👑 admin | routes/verification.ts:157 |
| `GET` | `/api/verification/:id/documents` | 🔒 auth | routes/verification.ts:174 |
| `PUT` | `/api/verification/:id/approve` | 👑 admin | routes/verification.ts:197 |
| `PUT` | `/api/verification/:id/reject` | 👑 admin | routes/verification.ts:212 |

## wallet — Wallet management

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/api/wallet/me` | 🔒 auth | routes/wallet.ts:106 |
| `POST` | `/api/wallet/topup` | 🔒 auth | routes/wallet.ts:117 |
| `POST` | `/api/wallet/withdraw` | 🔒 auth | routes/wallet.ts:130 |
| `POST` | `/api/wallet/debit` | 🔒 auth | routes/wallet.ts:144 |
| `POST` | `/api/wallet/refund` | 🔒 auth | routes/wallet.ts:157 |
| `POST` | `/api/wallet/topup/chapa` | 🔒 auth | routes/wallet.ts:172 |
| `GET` | `/api/wallet/topup/chapa/sandbox` | 🌐 public | routes/wallet.ts:209 |
| `GET` | `/api/wallet/topup/chapa/verify/:tx_ref` | 🌐 public | routes/wallet.ts:224 |
| `POST` | `/api/wallet/topup/stripe` | 🔒 auth | routes/wallet.ts:293 |

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
`backend/routes/`. Machine-readable versions: [`openapi.json`](openapi.json) (OpenAPI 3.1,
committed) and `backend/api-catalog.json` (generated locally).*