# Halehame — API Documentation

> Base URL: `http://localhost:3001` (dev) · `https://api.halehame.app` (production)
> All endpoints return JSON. All protected endpoints require `Authorization: Bearer <token>`.
> Errors follow `{ "error": "message" }` format.
> Last updated: August 2026

---

## Acronyms Used in This Document

| Acronym | Full Form |
|---------|-----------|
| API | Application Programming Interface |
| JWT | JSON Web Token |
| OTP | One-Time Password |
| UUID | Universally Unique Identifier |
| HTTP | HyperText Transfer Protocol |
| HTTPS | HyperText Transfer Protocol Secure |
| REST | Representational State Transfer |
| JSON | JavaScript Object Notation |
| CRUD | Create, Read, Update, Delete |
| GMV | Gross Merchandise Value |
| ETB | Ethiopian Birr — reference market currency |
| USD | United States Dollar |
| COD | Cash on Delivery |
| KYC | Know Your Customer |
| FTS | Full-Text Search |
| WS | WebSocket |

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
**Errors:** 400 (missing fields), 409 (email exists)

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
{ "access_token": "eyJhbG..." }
```

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

---

## Profiles

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
**Status values:** `pending | paid | processing | completed | cancelled`

### POST /api/orders/checkout/session
Create Stripe checkout session. Requires auth.

**Request:**
```json
{
  "product_id": "uuid",
  "product_title": "Habesha Dress",
  "unit_price": 1500,
  "quantity": 2,
  "seller_id": "uuid"
}
```
**Response:** `{ "url": "https://checkout.stripe.com/...", "session_id": "cs_..." }`

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

### POST /api/wallet/topup
Add funds to wallet. Requires auth.

**Request:** `{ "amount": 1000, "reference": "receipt-123" }`

### POST /api/wallet/withdraw
Request withdrawal. Requires auth.

**Request:** `{ "amount": 500, "bank_name": "CBE", "account_number": "1000123456" }`

### POST /api/wallet/debit
Debit a user's wallet. **Requires admin.**

**Request:** `{ "user_id": "uuid", "amount": 150, "description": "Commission 3%", "reference": "order-uuid" }`

### POST /api/wallet/refund
Refund to a user's wallet. Requires auth (called when return approved).

**Request:** `{ "user_id": "uuid", "amount": 1500, "description": "Return approved", "reference": "return-uuid" }`

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
