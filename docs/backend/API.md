# Nodbusiness — API Documentation

> Base URL: `http://localhost:3001` (dev) · `https://api.nodbusiness.app` (production)
> Frontend: `https://nodbusiness.app`
> All endpoints return JSON. All protected endpoints require `Authorization: Bearer <token>`.
> Errors follow `{ "error": "message" }` format.

---

## Authentication

### POST /api/auth/register
Register a new account. Sends OTP to email.

**Request:**
```json
{ "email": "user@example.com", "password": "secret123", "full_name": "Abebe Kebede" }
```
**Response 201:**
```json
{ "message": "Registration successful. Check your email for the verification code.", "userId": "uuid" }
```
**Response 200** (email already registered but never verified):
```json
{ "message": "Your account is awaiting verification. A new verification code has been sent.", "pendingVerification": true }
```
Re-registering an unverified email replaces its password and name with the new request's,
so only the person who can read the inbox ends up controlling the account.

**Errors:** 400 (missing fields), 403 (account suspended), 409 (verified account with this email exists), 503 (`OTP_DELIVERY_FAILED`)

---

### POST /api/auth/verify-otp
Verify OTP and receive access token.

**Request:**
```json
{ "email": "user@example.com", "otpCode": "123456" }
```
**Response 200:**
```json
{ "access_token": "eyJhbG..." }
```
**Errors:** 400 (invalid/expired OTP), 404 (user not found)

---

### POST /api/auth/login
Login with email + password.

**Request:**
```json
{ "email": "user@example.com", "password": "secret123" }
```
**Response 200:**
```json
{ "access_token": "eyJhbG..." }
```
**Errors:** 401 (wrong credentials), 403 (email not verified, code: `email_not_verified`)

---

### POST /api/auth/google
Login or register with Google ID token.

**Request:**
```json
{ "id_token": "google-id-token" }
```
**Response 200:**
```json
{ "access_token": "eyJhbG...", "onboarding_mode": null, "is_demo": false }
```
**Errors:** 401 (invalid token, no email, or `email_verified` is not `true`), 403 (account suspended), 503 (not configured or Google unreachable)

Linking by email: a verified local account keeps its password and gains Google sign-in. An
unverified local account is marked verified, and its password and pending OTP are cleared,
because whoever created it never proved they own the inbox.

---

### GET /api/auth/me
Get current user. Requires auth.

**Response 200:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "full_name": "Abebe Kebede",
  "role": "user",
  "is_verified": true,
  "created_at": "2026-01-01T00:00:00Z"
}
```

---

### GET /api/auth/me/export
"Download my data". Requires auth. Returns a JSON attachment with the account
(without password hash, OTP or tokens), profile, content, orders, reviews,
messages sent, seller data, partnerships and wallet ledger.

### DELETE /api/auth/me
"Delete my account". Requires auth. Body `{ confirm: "DELETE", password? }`;
`password` is required when the account has one. Anonymizes the account and
keeps financial records (see `docs/decisions/account-deletion-decisions.md`).
Errors: 422 without the confirmation or with a wrong password, 403 demo account,
409 `WALLET_BALANCE` / `OPEN_ORDERS` / last admin.

### POST /api/auth/forgot-password
Request password reset email. Always returns success (prevents user enumeration).

**Request:** `{ "email": "user@example.com" }`
**Response 200:** `{ "message": "If an account exists, a reset link has been sent." }`

---

### POST /api/auth/reset-password
Reset password with token from email link.

**Request:** `{ "token": "uuid-reset-token", "password": "newpassword" }`
**Response 200:** `{ "message": "Password updated successfully" }`

---

### PUT /api/auth/change-password
Change password while logged in. Requires auth.

**Request:** `{ "current_password": "old", "new_password": "new" }`
**Response 200:** `{ "message": "Password changed successfully" }`

### POST /api/auth/refresh
Silently refresh the access token using the HttpOnly `refresh_token` cookie. Called automatically by the axios interceptor in `api/client.ts` on any 401 — no manual call needed from application code.

**Response 200:** `{ "access_token": "eyJhbG..." }`
**Errors:** 401 (no cookie, invalid, or expired refresh token)

> Note: the axios 401 interceptor waits for this call to complete before marking `authChecked=true` in `AuthContext`. This prevents the logout loop that occurs when `AppLayout` redirects to `/login` before the refresh round-trip finishes.

---

### POST /api/auth/logout
Revoke refresh token and clear the HttpOnly cookie.

**Response 200:** `{ "success": true }`

---

### POST /api/auth/logout-all
Revoke all sessions for the current user. Requires auth.

**Response 200:** `{ "success": true }`

---

### GET /api/profiles/me
Get current user's profile. Requires auth.

### GET /api/profiles/by-user/:userId
Get profile by user ID. Public.

### GET /api/profiles/:id
Get profile by profile ID. Public.

### PUT /api/profiles/me/upsert
Create or update current user's profile. Requires auth.

**Request:** `{ "display_name": "Abebe", "bio": "Seller in Addis", "avatar_url": "https://..." }`

### PATCH /api/profiles/me/ticker
Update ticker display bar only.

**Request:** `{ "ticker_text": "Free delivery this week!", "ticker_type": "promo" }`
**ticker_type values:** `none | contact | promo | news | location | custom | auto`

### POST /api/profiles/follow/:targetUserId
Follow or unfollow a user. Requires auth.

**Response:** `{ "following": true }` or `{ "following": false }`

---

## Posts

### GET /api/posts
List posts. Optional query params:
- `feed=true` — smart feed (recent + popular + random)
- `author_id=uuid` — filter by author
- `post_type=text|image|product|task|event|poll`
- `sort=-created_at` · `limit=30`

### POST /api/posts
Create post. Requires auth.

**Request:**
```json
{
  "content": "Check out my new product!",
  "image_url": "https://...",
  "post_type": "text",
  "poll_options": ["Option A", "Option B"],
  "poll_ends_at": "2026-12-31T00:00:00Z"
}
```

### PUT /api/posts/:id
Edit a post. Only the author or an admin; others get `403`.
Accepts `content`, `image_url` (string or `null` to remove the photo) and `post_type`. A post with a photo may have an empty caption; a post must keep text or a photo (`422` otherwise).
Changing `content` or `image_url` sets `edited_at`, which the feed shows as "Edited", and re-syncs the post's hashtags.

### DELETE /api/posts/:id
Delete a post. Only the author or an admin. This is a hard delete. Comments, hashtag links and poll votes cascade. Likes and saves (bookmarks) of the post are removed, and hashtag post counts are decremented.
**Response:** `{ "success": true }`

### POST /api/posts/:id/like
Like or unlike a post. Requires auth.
**Response:** `{ "liked": true }` or `{ "liked": false }`

### GET /api/posts/:id/comments
Get comments for a post. Public.

### POST /api/posts/:id/comments
Add a comment. Requires auth.
**Request:** `{ "content": "Great post!" }`

---

## Products

### GET /api/products
List products. Optional: `seller_id`, `business_id`, `showroom_id`, `status`, `sort`, `limit`

### GET /api/products/:id
Get single product.

### POST /api/products
Create product. Requires auth.

**Request:**
```json
{
  "title": "Habesha Dress",
  "description": "Traditional handwoven dress",
  "price": 1500,
  "currency": "ETB",
  "stock": 10,
  "images": "[\"https://...\"]",
  "category": "Fashion"
}
```

### PUT /api/products/:id
Update product. Requires auth (must be seller or admin).

### DELETE /api/products/:id
Delete product. Requires auth (must be seller or admin).

---

## Orders

### GET /api/orders
List orders (buyer or seller's orders). Requires auth.
Optional: `buyer_id`, `seller_id`, `status`

### POST /api/orders
Create an order. Requires auth.

**Request:**
```json
{
  "seller_id": "uuid",
  "product_id": "uuid",
  "product_title": "Habesha Dress",
  "quantity": 2,
  "unit_price": 1500,
  "total_price": 3000,
  "currency": "ETB"
}
```

### PUT /api/orders/:id
Update order status. Requires auth (buyer, seller, or admin).

**Request:** `{ "status": "completed" }`
**Status values:** `pending | awaiting_payment | payment_reported | paid | confirmed | processing | shipped | delivered | completed | cancelled | expired`

Order responses never include the private-link token hash or the receipt storage key; they include `has_receipt` instead.

### POST /api/orders/checkout/session, POST /api/orders/checkout/chapa
**Retired: `410 PLATFORM_COLLECTION_RETIRED`.** NodBusiness never collects buyer money
([platform model decisions](../decisions/platform-model-decisions.md)). Buyers pay the seller
directly; see Direct orders.

---

## Direct orders (pay the seller directly)

The buyer pays the seller using the seller's own payment accounts, reports the payment, and only
the seller confirms it. No account is needed to buy. Unpaid orders expire after 7 days and their
stock is released.

### GET /api/direct-orders/checkout-info?product_id=uuid | showroom_id=uuid
Public. The seller's business name, the contact fields the owner chose to show, and active payment
accounts. Never includes the pickup address. The response adds `payment_window_days`.

### POST /api/direct-orders
Public (optional auth). Rate limited to 10 per 15 minutes per IP.

**Request:**
```json
{
  "product_id": "uuid",
  "quantity": 1,
  "buyer_name": "Abebe",
  "buyer_phone": "+251911000000",
  "buyer_email": "buyer@example.com",
  "delivery_address": "optional",
  "notes": "optional",
  "partnership_code": "optional"
}
```
**201:** `{ order, access_token, order_url, business, payment_accounts }`. The order starts as
`awaiting_payment` and its stock is reserved. The private link `/order/<access_token>` is also
emailed; only a SHA-256 hash of the token is stored.
**409 `NO_PAYMENT_ACCOUNTS`:** the seller has no active payment account.
**422:** invalid contact details, or a seller buying their own product.

### GET /api/direct-orders/link/:token
Public, by private link. Returns the order, the seller's contact details (including the pickup
address), payment accounts, and `receipt_uploads` (whether a receipt can be attached).
**404:** unknown link.

### POST /api/direct-orders/link/:token/report-payment, POST /api/direct-orders/:id/report-payment
The buyer reports a payment, by link or signed in. Multipart fields: `payment_reference` (optional)
and `receipt` (optional JPEG, PNG, WebP or PDF, up to 5 MB, stored in the private
`RECEIPTS_SUPABASE_BUCKET`). Moves `awaiting_payment` to `payment_reported`.
**409:** the order is no longer open. **503 `RECEIPTS_UNAVAILABLE`:** a receipt was sent but no
private bucket is configured.

### POST /api/direct-orders/:id/confirm-payment
Seller or admin only. Moves an open order to `paid`. Anyone else gets `404`.

### POST /api/direct-orders/:id/reject-payment
Seller or admin only. Moves `payment_reported` back to `awaiting_payment` and tells the buyer.

### GET /api/direct-orders/link/:token/receipt, GET /api/direct-orders/:id/receipt
Returns a short-lived signed URL, `{ "url": "..." }`, for the buyer (by link) or the seller/admin.

### Business payment accounts
- `GET /api/businesses/:id/payment-accounts`: owner only.
- `POST /api/businesses/:id/payment-accounts`: owner only, at most 10 per business. Fields:
  `method` (`bank | mobile_money | other`), `provider_name`, `account_name`, `account_number`,
  `instructions`, `is_active`, `sort_order`.
- `PUT /api/businesses/:id/payment-accounts/:accountId` and `DELETE /api/businesses/:id/payment-accounts/:accountId`: owner only.
- `GET /api/businesses/:id/checkout-info`: public seller details and active accounts, as above.

Businesses and profiles expose only the contact fields listed in `public_contact_fields`.
`businesses.pickup_address` is shown to a buyer only after they place an order.

---

## Business visibility and guest access

A business is `public` (default) or `private`, set with `visibility` on
`POST /api/businesses` and `PUT /api/businesses/:id` (any other value returns
`422`). See [platform model decisions](../decisions/platform-model-decisions.md) §7.5.

**Private businesses.** For a signed-out request:
- Direct reads return `401 { code: "SIGN_IN_REQUIRED" }`: site by slug or id, business, product, checkout-info and `POST /api/direct-orders`.
- Lists and other surfaces simply leave them out: showrooms, businesses, products, reviews, variants, search, maps, live location, trending and the sitemap.
- Link previews return `404`.

Signed-in users, owners and admins see private businesses as usual.

**Personal content needs sign-in.** For a signed-out request:
- `/api/posts` (feed, post, comments) and hashtag posts return only announcement posts of live, public business sites. Any other post returns `401 SIGN_IN_REQUIRED`.
- Profiles return only business profiles whose owner has a public business. Personal profiles return `401`, and lists leave them out.
- Search, maps and trending return no people or personal posts.
- Stories, poll results and `/api/profile-partnerships/profile/:userId` return `401`.

For everyone, an announcement post is hidden once its site is unpublished, expired or hidden by a lapsed subscription.

## Scheduled jobs (internal)

### POST /api/internal/jobs/:name
Runs one scheduled job now: `subscription-lifecycle`, `direct-order-expiry`,
`stories-cleanup` or `auth-state-cleanup`. Called every 15 minutes by
`.github/workflows/scheduled-jobs.yml` because the backend host sleeps when idle.
Returns `404` unless `JOBS_SECRET` (32+ characters) is set; needs
`Authorization: Bearer <JOBS_SECRET>` (otherwise `401`). Returns `409` when the
same job is already running (Postgres advisory lock), `500` without details on failure.

## Share previews

### GET /api/share-preview/showroom/:slug, GET /api/share-preview/product/:id
Public fields used for link-preview metadata (title, description, image). Hidden or unpublished
items return `404`. These reads do not count as views.

---

## Wallet

### GET /api/wallet/me
Get wallet balance and last 50 transactions. Requires auth.

**Response:**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "balance": "5000.00",
  "currency": "ETB",
  "transactions": [
    { "type": "credit", "amount": "5000.00", "description": "Wallet top-up", "created_at": "..." }
  ]
}
```

### POST /api/wallet/topup (and /topup/chapa, /topup/stripe)
**Retired: `410 PLATFORM_COLLECTION_RETIRED`.** The wallet is withdraw-only for existing balances.

### POST /api/wallet/withdraw
Request withdrawal. Requires auth.

**Request:** `{ "amount": 500, "bank_name": "CBE", "account_number": "1000123456" }`

### POST /api/wallet/debit
**Retired: `410 PLATFORM_COLLECTION_RETIRED`.** No commission is collected.

### POST /api/wallet/refund
**Retired: `410 PLATFORM_COLLECTION_RETIRED`.** Refunds are settled between buyer and seller.

---

## Messages

### GET /api/messages/conversations
List conversations. Requires auth.

### POST /api/messages/conversations
Create a conversation. Requires auth.

**Request:** `{ "participant_ids": ["uuid1", "uuid2"], "type": "dm" }`

### GET /api/messages/conversations/:id/messages
Get messages in a conversation. Requires auth.

### POST /api/messages/conversations/:id/messages
Send a message. Requires auth.

**Request:** `{ "content": "Hello!", "type": "text" }`

---

## Reviews

### GET /api/reviews
List reviews. Optional: `product_id`, `reviewer_id`, `sort`, `limit`

### GET /api/reviews/product/:productId
Get all reviews for a product.

### POST /api/reviews
Create or update a review. Requires auth (one review per user per product).

**Request:**
```json
{ "product_id": "uuid", "order_id": "uuid", "rating": 5, "comment": "Excellent quality!" }
```

---

## Referral

### GET /api/referral/my-code
Returns `{ code, referral_link, referrals, total_referred, earned }`. `referrals`
and `total_referred` are the same count (users whose `referred_by` is the caller);
`earned` sums the caller's `point_transactions.points` with a `referral:` reference.

### POST /api/referral/apply
Body `{ code }` (alias `/use`). Records `referred_by` once per user and, in one
transaction, awards 50 points to the referrer and 20 to the caller
(`point_transactions` rows plus `user_profiles.points`). 404 for an unknown or own
code, 409 when a code was already applied.

---

## Verification

### GET /api/verification/status
Returns `{ is_verified, verification_type, verified_at, request }`, where
`request` is the caller's latest request (`id, status, verification_type,
admin_note, created_at, reviewed_at`) or `null`.

### POST /api/verification/request
Body `{ verification_type, selfie_url, id_document_url, supporting_docs?, reason? }`.
Both URLs are required (http/https). 409 while a request is pending. After a
request is approved or rejected, a new request re-opens the same row
(`verification_requests` has `UNIQUE(user_id)`), resetting it to `pending`.

---

## Feature Flags

### GET /api/flags
Get all flags with effective values for current user. Requires auth.

### GET /api/flags/:name
Check a single flag for current user. Requires auth.

**Response:** `{ "flag": "personalized_feed", "enabled": false }`

### PUT /api/flags/:name
Update a flag in Redis. **Requires admin.**

**Request:** `{ "enabled": true, "rollout": 10 }`

---

## Notifications

### GET /api/notifications
Get notifications. Requires auth. Optional: `is_read=true|false`, `limit`

### PUT /api/notifications/read-all
Mark all notifications as read. Requires auth.

### PUT /api/notifications/:id/read
Mark one notification as read. Requires auth.

---

## Upload

### POST /api/upload
Upload a file (image). Requires auth.

**Request:** `multipart/form-data` with `file` field
**Response:** `{ "url": "https://pub-xxx.r2.dev/filename.jpg" }`
**Limits:** `MAX_FILE_SIZE_MB` (default 10MB); images, videos, PDFs only

---

## Health

### GET /health
Public health check.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-07-04T12:00:00Z",
  "version": "1.0.0",
  "services": {
    "database": "connected",
    "redis": "connected",
    "ai": "openai",
    "email": "resend",
    "storage": "r2"
  }
}
```

---

## Error Responses

All errors follow this format:
```json
{ "error": "Human-readable error message" }
```

| Status | Meaning |
|---|---|
| 400 | Bad request — missing or invalid fields |
| 401 | Unauthenticated — no token or expired token |
| 403 | Forbidden — authenticated but not authorized |
| 404 | Not found |
| 409 | Conflict — duplicate (e.g., email already registered) |
| 413 | File too large |
| 429 | Rate limited |
| 500 | Server error — check Sentry |
| 503 | Service unavailable — Stripe/AI not configured |

---

## Mewacho — Group Money Collections

> ምውጮ (Mewacho) is the group money collection module. Groups are like group chats whose primary purpose is pooling money together for a specific goal.

### GET /api/mewacho/groups
List all groups the current user is a member of. Requires auth.

**Response 200:**
```json
[
  {
    "id": "uuid",
    "name": "Sara's Birthday",
    "purpose": "birthday",
    "target_amount": "10000.00",
    "total_collected": "4500.00",
    "member_count": 12,
    "my_role": "admin",
    "status": "active",
    "invite_code": "ab12cd34ef"
  }
]
```

---

### POST /api/mewacho/groups
Create a new group. Requires auth. Creator is automatically added as admin.

**Request:**
```json
{
  "name": "Office Trip to Hawassa",
  "description": "Annual office trip collection",
  "purpose": "trip",
  "target_amount": 50000,
  "cover_photo": "https://..."
}
```
**Purpose values:** `birthday` · `charity` · `wedding` · `trip` · `office` · `fundraising` · `general`

**Response 201:** Full group object.

---

### GET /api/mewacho/groups/join/:invite_code
Join a group via invite link. Requires auth. Returns `already_member: true` if already joined.

**Response 200:** `{ "group": { ... }, "already_member": false }`

---

### GET /api/mewacho/groups/:id
Get full group detail. Requires auth (must be a member).

**Response 200:**
```json
{
  "group": { "id": "uuid", "name": "...", "total_collected": "4500.00", ... },
  "members": [{ "user_id": "uuid", "role": "admin", "display_name": "Abebe", ... }],
  "contributions": [{ "amount": "500.00", "display_name": "Sara", "status": "confirmed", ... }],
  "activity": [{ "type": "contribution", "content": "Sara contributed 500 ETB via Stripe", ... }],
  "withdrawals": [{ "amount": "1000.00", "status": "pending", ... }],
  "my_role": "admin"
}
```

---

### POST /api/mewacho/groups/:id/contribute
Create a Stripe Checkout session to contribute to a group. Requires auth (must be a member).

**Request:**
```json
{ "amount": 500, "is_anonymous": false }
```
**Response 200:**
```json
{ "checkout_url": "https://checkout.stripe.com/...", "session_id": "cs_...", "contribution_id": "uuid" }
```
The contribution is recorded as `pending` until the Stripe webhook confirms payment.

---

### POST /api/mewacho/groups/:id/message
Post a chat message in the group feed. Requires auth (must be a member).

**Request:** `{ "content": "Looking forward to the trip!" }`
**Response 201:** Activity object with `type: "message"`.

---

### POST /api/mewacho/groups/:id/withdraw
Request a withdrawal from the group. Requires auth (must be admin).

Withdrawals over 5,000 ETB or groups with multiple admins require approval from all admins before processing.

**Request:**
```json
{
  "amount": 2000,
  "destination_type": "bank",
  "destination_ref": "1000123456789",
  "note": "Venue deposit"
}
```
**destination_type values:** `bank` · `telebirr` · `cbe`

**Response 201:** Withdrawal object with `status: "pending"` or `"approved"`.

---

### PUT /api/mewacho/withdrawals/:wid/approve
Approve a pending withdrawal. Requires auth (must be admin of the group).

**Response 200:** Updated withdrawal object.

---

### PUT /api/mewacho/withdrawals/:wid/reject
Reject a pending withdrawal. Requires auth (must be admin of the group).

**Response 200:** Updated withdrawal object with `status: "rejected"`.

---

### POST /api/mewacho/webhook
Stripe webhook for contribution payment confirmation. Raw body required (registered before JSON middleware).

**Handled events:** `checkout.session.completed`

On payment confirmation:
- Contribution status updated to `confirmed`
- Activity feed entry created: `"Abebe contributed 500 ETB via Stripe"`
- Push notification sent to all group members

> Set `STRIPE_MEWACHO_WEBHOOK_SECRET` in Render env vars. Create a separate Stripe webhook endpoint pointing to `https://nodbusiness-backend.onrender.com/api/mewacho/webhook` with the `checkout.session.completed` event selected.
