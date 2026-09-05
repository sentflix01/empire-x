# Nodbusiness — Sequence Diagrams

> This file is the authoritative reference for key request flows.

---

## Auth Flow — Register → OTP → Login

```
User             Frontend         Backend          DB / Email
 │                  │                │               │
 │─ fill form ─────▶│                │               │
 │                  │─POST /api/auth/register        │
 │                  │                │─ hash pw ────▶│ INSERT user
 │                  │                │─ generate OTP─▶│ store otp_code
 │                  │                │─ send OTP email (console in dev)
 │                  │◀─ 201 userId ──│               │
 │◀─ show OTP form ─│                │               │
 │─ enter OTP ─────▶│                │               │
 │                  │─POST /api/auth/verify-otp      │
 │                  │                │─ check otp ──▶│
 │                  │                │─ is_verified=TRUE
 │                  │                │─ sign access + refresh tokens
 │                  │                │─ set HttpOnly refresh cookie
 │                  │◀─ { access_token }             │
 │◀─ redirect /feed─│                │               │
```

---

## Auth Flow — Silent Token Refresh (page load with expired access token)

```
User             Frontend/AuthContext    axios interceptor    Backend
 │                  │                        │                   │
 │─ page load ─────▶│                        │                   │
 │                  │─ read localStorage token                   │
 │                  │─ storeToken(token) [hydrate memory]        │
 │                  │─ GET /api/auth/me ────▶│                   │
 │                  │                        │─ Bearer expired ─▶│
 │                  │                        │◀─ 401 ────────────│
 │                  │                        │─ POST /api/auth/refresh (HttpOnly cookie)
 │                  │                        │◀─ { access_token }│
 │                  │                        │─ storeToken(new)  │
 │                  │                        │─ retry GET /me ──▶│
 │                  │                        │◀─ 200 user ───────│
 │                  │◀─ user data ───────────│                   │
 │                  │─ setUser, authChecked=true                 │
 │◀─ render app ────│                        │                   │
```

> Key invariant: `authChecked` is only set inside the `finally` block of the full `await client.get('/api/auth/me')` call. This means `AppLayout`'s redirect to `/login` only fires after the complete refresh + retry chain resolves — never mid-flight.

---

## Payment Flow — Stripe Checkout (Orders)

```
User             Frontend         Backend          Stripe          DB
 │                  │                │               │              │
 │─ click Buy ─────▶│                │               │              │
 │                  │─POST /checkout/session         │              │
 │                  │                │─ validate ───▶│              │
 │                  │                │─ INSERT order (status=pending)
 │                  │                │─ create session ────────────▶│
 │                  │                │◀─ { url } ────│              │
 │                  │◀─ { url } ─────│               │              │
 │◀─ redirect ──────│                │               │              │
 │ [user pays on Stripe hosted page] │               │              │
 │                  │  Stripe Webhook → POST /api/orders/webhook   │
 │                  │                │─ verify sig ─▶│              │
 │                  │                │─ UPDATE order status=paid ──▶│
 │                  │                │─ notify buyer + seller        │
 │◀─ redirect success ──────────────│               │              │
```

---

## Payment Flow — Mewacho Group Contribution (Stripe)

```
Member           Frontend         Backend          Stripe          DB
 │                  │                │               │              │
 │─ enter amount ──▶│                │               │              │
 │                  │─POST /api/mewacho/groups/:id/contribute      │
 │                  │                │─ INSERT contribution(pending)│
 │                  │                │─ stripe.checkout.sessions.create
 │                  │                │◀─ { url, id } │              │
 │                  │◀─ { checkout_url }             │              │
 │◀─ redirect ──────│                │               │              │
 │ [user pays on Stripe hosted page] │               │              │
 │                  │  Stripe Webhook → POST /api/mewacho/webhook  │
 │                  │                │─ verify sig ─▶│              │
 │                  │                │─ UPDATE contribution(confirmed)
 │                  │                │─ INSERT activity("Abebe contributed 500 ETB via Stripe")
 │                  │                │─ push notify all members      │
 │◀─ redirect /mewacho/:id?payment=success          │              │
```

---

## AI Product Description Generation

```
Seller           Frontend         Backend          OpenAI/Gemini
 │                  │                │               │
 │─ type title ────▶│                │               │
 │─ click Generate─▶│                │               │
 │                  │─POST /api/ai/generate          │
 │                  │                │─ prompt ─────▶│
 │                  │                │◀─ description─│
 │                  │◀─ { text } ────│               │
 │◀─ filled field ──│                │               │
```

---

## Return Request Flow

```
Buyer            Frontend         Backend          Seller           Wallet
 │                  │                │               │               │
 │─ request return─▶│                │               │               │
 │                  │─POST /api/returns              │               │
 │                  │                │─INSERT return_request ───────▶│
 │                  │                │─notify seller ───────────────▶│
 │                  │◀─ 201 ─────────│               │               │
 │                  │                │               │               │
 │                  │                │  Seller reviews               │
 │                  │                │◀─PUT /api/returns/:id {approved}
 │                  │                │─UPDATE return status=approved │
 │                  │                │─POST /api/wallet/refund ─────▶│
 │                  │                │                               │─ credit buyer
 │                  │                │─notify buyer                  │
```

---

## Nearby Map Search

```
User             Frontend         Backend          PostgreSQL
 │                  │                │               │
 │─ open Nearby ───▶│                │               │
 │                  │─GET /api/maps/nearby?lat=9&lng=38&radius=5
 │                  │                │─ SELECT products WHERE distance < radius
 │                  │                │◀─ [{products with distance}]
 │                  │◀─ products ────│               │
 │◀─ pins on map ───│                │               │
 │                  │                │               │
 │─ hover pin ─────▶│                │               │
 │                  │─GET /api/profiles/by-user/:id  │
 │                  │◀─ profile data─│               │
 │◀─ ProfilePeek ───│                │               │
```
