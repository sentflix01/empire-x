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

### Reactions on posts and comments
- **`PUT /api/posts/:id/reaction`** and **`PUT /api/posts/:postId/comments/:commentId/reaction`** take `{ "reaction" }`: any single emoji, including skin tones, flags and family emojis (up to 32 characters). One reaction per person; a new one replaces the old.
- Words, two emojis or an empty value get `422 { "error": "invalid_reaction", "message": "React with a single emoji." }`.
- **`DELETE`** on the same paths removes yours. **`GET /api/posts/:id/reactions`** lists counts and the people who reacted, except people who hide their reactions.

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
  "category": "Fashion",
  "barcode": "5449000000996",
  "manufacturer": "Coca-Cola",
  "unit": "330 ml"
}
```

`barcode` is optional (EAN-8, EAN-13, UPC-A or EAN-14, checksum checked, stored
as 13 digits where possible). The same seller can't use one barcode on two
products: `409 { error: "barcode_exists", existing_product_id }`.

**Selling business.** `business_id` and `showroom_id` are optional and must belong
to the caller (`403` otherwise). With neither, the product is attached to the
seller's business when they own exactly one. A seller with several businesses
should send `business_id`; without it the product has no business and can't be
ordered.

**201** returns the product plus:

| Field | Meaning |
|---|---|
| `selling_business_id` | The business buyers pay (own business, then the showroom's, then the seller's only business), or `null`. |
| `payment_ready` | `true` when buyers can order it now. |
| `checkout_blocker` | Why not, when `payment_ready` is `false`: `no_business`, `no_plan` (the business has no active paid plan, so its products are hidden from buyers) or `no_payment_method` (no active payment account). |

### PUT /api/products/:id
Update product. Requires auth (must be seller or admin). Same barcode rules as create.

### GET /api/products/lookup/:code
Scan to add. Requires auth; 60 lookups per minute. `code` is a barcode number or
the text of a QR code (a GS1 Digital Link `…/01/<GTIN>` counts as a barcode).

Looks in this order and stops at the first answer:
1. **Your own products** → `source: "mine"`, `existing_product { id, title, stock, price, currency }`.
2. **Other sellers' active, public products** with that barcode → `source: "nodbusiness"`. Only name,
   description, category, brand, size and first photo are shared, never price, stock, cost or supplier.
   Products of private businesses are never shared.
3. **Open Food / Beauty / Products Facts** (asked together, 6 s limit, cached 30 days in
   `barcode_lookups`; "not found" is cached 3 days and only when every database answered).
4. Otherwise `source: "not_found"`.

```json
{ "kind": "gtin", "gtin": "5449000000996", "source": "open_food_facts",
  "credit": "Open Food Facts (CC BY-SA)", "existing_product": null,
  "suggestion": { "title": "Coca-Cola", "description": "…", "category": "Sodas",
                  "brand": "…", "image_url": "https://images.openfoodfacts.org/…", "unit": "330 ml" } }
```

A QR code that isn't a product returns `{ "kind": "text", "text": "…", "message": "…" }`.
An invalid barcode returns 422.

### POST /api/products/import-image
`{ "url": "https://images.openfoodfacts.org/…" }` → `{ "url": "<our storage>" }`. Copies a
suggested photo into our storage so products never depend on another site. Only the
open-database image hosts, https, no redirects, JPEG/PNG/WebP up to 5 MB, bytes checked.
Any other link: 422.

### POST /api/products/scan-batch
Quick scan mode's "Save all". `{ "items": [...], "business_id"? }`, up to 200 items, each either
`{ "product_id", "add_stock" }` (one of yours) or a new product (`title`, `price`, `stock`, `barcode`,
optional `description`, `category`, `manufacturer`, `unit`, `images`). All or nothing in one
transaction → `201 { created: [ids], updated: [ids] }`. A bad item → `422 { index, message }`;
a barcode you already use → `409 { index, existing_product_id }`.

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

### GET /api/direct-orders/checkout-info?product_id=uuid | showroom_id=uuid | business_id=uuid | seller_id=uuid
Public. The seller's business name, the contact fields the owner chose to show, and active payment
accounts. Never includes the pickup address. The response adds `payment_window_days`.
`seller_id` resolves the seller's business when they have exactly one. A product with no
business of its own (or through its showroom) uses the seller's business the same way;
`POST /api/direct-orders` resolves the business with the same rule.

### POST /api/direct-orders/requests
Public (optional auth), same rate limit as orders. **Request to order** a website item that is
not a catalogue product (a service, package or best seller typed into a website section).
```json
{ "showroom_id | business_id | seller_id": "uuid", "item_title": "Delivery", "quantity": 1,
  "buyer_name": "Abebe", "buyer_phone": "+251911000000", "buyer_email": "buyer@example.com",
  "delivery_address": "optional", "notes": "optional" }
```
The item must appear (by name, case-insensitive) in that seller's published site, Business
profile or profile business sections; otherwise **404**. **201:** `{ order, access_token,
order_url, business, payment_accounts }` with `status: "requested"`, no price, and
`listed_price_text` (the price shown on the website). The private link is emailed. A request
without an answer expires after 7 days. **422:** invalid contact details, or requesting from
your own business.

### POST /api/direct-orders/:id/set-price `{ "unit_price": 150 }`
Seller or admin only. Confirms a `requested` order at that unit price (total = price ×
quantity), moves it to `awaiting_payment` with a new 7-day payment window, and tells the buyer.
**409 `NO_PAYMENT_ACCOUNTS`:** add a payment account first. **409:** not a request.

### POST /api/direct-orders/:id/decline-request
Seller or admin only. Moves a `requested` order to `cancelled` and tells the buyer.

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

All routes require auth. The rules live in `backend/lib/messaging.ts` and `backend/lib/socialGraph.ts`.

**Error shape:**
- Refusals return `403 { error: "messages_not_allowed", code, message }`. Show `message` to the person.
- Validation returns `422 { error, code: "VALIDATION_ERROR" }`.
- IDs that aren't UUIDs return 404.

**Limits (per person, per minute):** 30 messages or forwards, and 20 new chats, groups or inquiries.

### GET /api/messages/conversations
Your chats, newest activity first (up to 100). `?box=` is `chats`, `requests` or `archived`; without it you get chats and requests, which older app versions expect.

**Each chat includes:**
- **About the chat:** `my_role`, `unread_count`, `is_request`, `muted`, `muted_until`, `archived_at`.
- **The last message you can see:** `last_message`, `last_message_id`, `last_message_sender_id`, `last_message_at`.
- **One-to-one chats only:** `other_user_id`, `other_name`, `other_avatar`, `other_last_delivered_at`, and `other_last_read_at`. The last one is `null` unless both people allow read receipts.

**Requests:** a first message from someone you don't follow waits in Requests until you accept or reply.

**Archived chats** come back when a new message arrives, unless they're muted.

### GET /api/messages/unread-count
`{ chats, messages, requests }` for the Messages badge. Muted and archived chats don't count.

### GET /api/messages/conversations/:id
The chat plus `members: [{ user_id, role, display_name, avatar_url, last_delivered_at, last_read_at }]`. Other people's `last_read_at` is `null` unless both of you allow read receipts.

### POST /api/messages/conversations/:id/read · POST /api/messages/delivered
- **Read:** marks the chat read up to now, along with its message notifications. It emits `conversation_read`, only to members who share read receipts with you, and `conversation_delivered`.
- **Delivered:** `{ conversation_ids? }`. The app calls it whenever it receives messages, which gives the sender ✓✓.

### Mute, archive, requests, delete for me
- **`PUT /conversations/:id/mute`** `{ duration: "8h" | "1w" | "always" | "off" }`: no notifications, and the chat leaves the badge.
- **`PUT /conversations/:id/archive`** `{ archived }`.
- **`POST /conversations/:id/accept`** accepts a request.
- **`DELETE /conversations/:id/for-me`** (also `/history`): hides the chat and its older messages for you only, until someone writes again. It also declines a request.
- **`DELETE /api/messages/:id/for-me`**: hides one message for you only.

### POST /api/messages/conversations/find-or-create
`{ "target_user_id": "uuid" }`. Opens the one-to-one chat with someone, creating it the first time (201), or returns the existing one (200).

**New chats follow the other person's "who can message me"** (everyone / followers / nobody) and blocks in both directions. An existing chat always reopens, but sending into it stops while either person blocks the other.

### POST /api/messages/conversations/business
Opens the **business chat** between a customer and a business: one per customer and business, separate from any personal chat with the owner. It reopens if it already exists.

`{ "business_id": "uuid", "context"?: { "kind": "product" | "order" | "showroom", "id": "uuid" }, "customer_id"?: "uuid" }`
- **As a customer:** `business_id` is enough. The owner's personal "who can message me" setting doesn't apply; blocks still do.
- **As the owner:** pass `customer_id` and an `order` context. Owners can only start chats from one of the customer's orders.
- **Context:** the item must belong to that business, otherwise 422 "That item isn't from this business". It adds a `context` card (a title and photo snapshot linking to the live page, never a price) to the chat.
- **Who sees whom:** the customer sees the business (name and logo, no personal "last seen"); the owner sees the customer, under their **Business** tab. Rows carry `business_id`, `business_name`, `business_logo` and `is_business_side`.

### GET /api/messages/quick-replies?business_id= · PUT /api/messages/quick-replies
The owner's saved answers, tapped to fill the message box in business chats. PUT replaces the list: `{ "business_id": "uuid", "replies": ["…"] }`, with up to 20 replies of 1–500 characters each. Owner only (403 otherwise).

### POST /api/messages/conversations
Creates a group or channel: `{ "type": "group" | "channel", "name", "participant_ids": ["uuid"], "description"?, "avatar_url"? }`.
- The creator becomes the admin.
- A name is required.
- Up to 256 members.
- Every person must exist and be someone you could message.
- `type: "dm"` is refused; one-to-one chats only come from find-or-create.

### PUT /api/messages/conversations/:id
Changes a group's `name`, `description` or `avatar_url` (admins only). One-to-one chats can't be renamed.

### GET /api/messages/conversations/:id/messages
Members only. `limit` (1–500, default 100) and `before` (an ISO date) page back through older messages. Messages come oldest-first.

### POST /api/messages/conversations/:id/messages
`{ "content": "Hello!", "type": "text" | "image" | "file", "reply_to_id"? }`
- **Cards are made by the server:** `product`, `order_update` and `context` messages get **422** here. Share a product with `POST /api/messages/share-product` (`{ conversation_id, product_id }`), which builds the card from the real product.
- **Content:** 1–4,000 characters, trimmed. Photos and files must be `https` links.
- **Replies:** `reply_to_id` must be a message in the same chat.
- **Who can post:** in a channel, only admins post. A one-to-one chat stops while either person blocks the other.
- **On send:** updates the chat list summary, emits `new_message` to the chat, and creates a `message` notification (plus web push) for every other member.

### PUT /api/messages/:id · DELETE /api/messages/:id · POST /api/messages/:id/forward
The older `/api/messages/messages/:id…` paths still work.
- **Edit:** your own text messages, within 15 minutes. The message is marked `edited`.
- **Delete for everyone:** your own messages, within 24 hours (site admins: any). The chat list summary is refreshed.
- **Forward:** `{ "target_conversation_id" }`. You must be in both chats and allowed to post in the target. Otherwise you get 404 for the source and 403 for the target.

### Reactions and pins
- **`POST /api/messages/messages/:id/reactions`** `{ "emoji" }`: any single emoji (as for posts); anything else gets `422`. A person can add several different emojis to one message. **`DELETE`** with the same body removes yours. Both return `{ reactions }`, where each emoji maps to `{ count, users }`, and send `reaction_added` / `reaction_removed` to the chat.
- **`POST` / `DELETE /api/messages/messages/:id/pin`**: any member pins or unpins a message, sending `message_pinned` / `message_unpinned`. **`GET /conversations/:id/pins`** lists up to 50 pins, newest first, with each message's `content` and `type`. The chat shows the newest pin in a bar at the top.

### Groups
- **`POST /conversations/:id/members`** `{ "user_id" }`: admins add people they could message.
- **`DELETE /conversations/:id/members/:userId`**: admins remove people. Removed people stop receiving live messages at once.
- **`POST /conversations/:id/leave`**: when the last admin leaves, the longest-standing member becomes admin.
- **`PUT /conversations/:id/members/:userId`** `{ "role": "admin" | "member" }`: admins make someone admin or take it back. A group always keeps at least one admin (`422` otherwise). Admins leave with Leave, not by removing themselves.
- **`PUT /conversations/:id`** `{ name?, description?, avatar_url? }`: admins rename the group or channel.
- **`DELETE /conversations/:id`**: admins delete the group. One-to-one chats can't be left or deleted for both people.
- **Limits and rules:** up to 256 members. In a channel only admins post. You can add only people you could message.
- **Live:** every member change, role change and rename sends `members_changed` and `conversation_updated` (`{ conversation_id }`) to each affected person's own room, including someone who was just removed.

### POST /api/messages/inquiry
"Get a quote": `{ "receiver_id", "subject"?, "body" }`. It opens (or reuses) the one-to-one chat with the business owner, under the same rules as any first message. The request shows in the owner's chat list and notifications. The buyer's email is never included.

### Block
- **`POST` / `DELETE /api/messages/block/:userId`** behave like `/api/social/block`: blocking also ends follows both ways.
- **`GET /api/messages/block/:userId`** returns `{ blocked, blocked_me }`.

### Live events (Socket.IO)
- **Connecting:** use an access token (`auth.token`). A demo session's socket uses the demo database. A ban closes the connection, and a recovered connection is checked again.
- **Joining:** `join_conversation` (members only).
- **Typing:** `typing { conversationId, isTyping }` reaches only the chat and respects blocks. Repeats are sent at most once every 3 s.
- **Server events, to the chat room:** `new_message`, `message_edited`, `message_deleted`, `typing_updated`.
- **Server events, to each person's own room (all their devices):** `conversation_updated` (the new list summary), `unread_changed`, `conversation_read`, `conversation_delivered`, `message_hidden`, `presence_updated`, `new_notification`.

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
Your notifications, newest first: `{ notifications: [...], next_cursor }`.
- **`days=1..90`:** everything from the last N days, up to 500 (the Notifications page asks for 7).
- **`cursor=<created_at>`:** older than that; `next_cursor` is null when there's nothing more.
- **Also:** `limit` (default 20, max 200), `is_read`, `sort=unread_first`.

Notifications are kept; nothing deletes them except you (`DELETE /api/notifications/:id`) or deleting your account.

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
