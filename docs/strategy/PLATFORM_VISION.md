# Halehame — Platform Vision

> **"We build the infrastructure. The world builds the value."**
>
> Halehame is not an app. It is a platform.
> The difference: an app serves its users. A platform serves its users AND
> the developers, businesses, and builders who create value on top of it.

---

## The Telegram Parallel

Telegram started as a messaging app. It became a $30B platform by making one decision:
open everything. Any developer can build on Telegram. Any business can run on Telegram.
Any community can organize on Telegram. Telegram provided the infrastructure; the world
provided the value.

Halehame follows the same strategy — but for commerce, identity, and community in
Africa and beyond.

---

## The Platform Layers

```
┌─────────────────────────────────────────────────────────────┐
│  LAYER 4: ECOSYSTEM                                          │
│  Developer marketplace · Partner program · Certified apps   │
├─────────────────────────────────────────────────────────────┤
│  LAYER 3: BUSINESS INFRASTRUCTURE                            │
│  Payments API · Notifications API · Identity (OAuth)         │
│  Commerce widget · Webhook system · API keys                 │
├─────────────────────────────────────────────────────────────┤
│  LAYER 2: DEVELOPER PLATFORM                                 │
│  Public REST API · "Login with Halehame" · Embed widgets     │
│  Developer dashboard · Documentation · SDKs                 │
├─────────────────────────────────────────────────────────────┤
│  LAYER 1: CORE PRODUCT (built)                               │
│  Social feed · Marketplace · Messaging · Tasks               │
│  Showrooms · Wallet · Jobs · Events · Courses · Maps         │
└─────────────────────────────────────────────────────────────┘
```

---

## Layer 1 — Core Product (Current State)

The foundation is built. This is the hook that brings users onto the platform.

| Feature | Status |
|---------|--------|
| Social feed + stories | ✅ Built |
| Marketplace + orders | ✅ Built |
| Real-time messaging | ✅ Built |
| Tasks & gigs | ✅ Built |
| Business showrooms | ✅ Built |
| Wallet + payments | ✅ Built |
| Jobs, events, courses | ✅ Built |
| Nearby map | ✅ Built |
| AI assistant | ✅ Built |
| Push notifications | ✅ Built |

---

## Layer 2 — Developer Platform

What needs to be built so any developer can build on Halehame.

### 2.1 Public REST API (with API Keys)

**Today:** The API exists but requires a user JWT. Only Halehame's own frontend uses it.

**Target:** Any developer registers, gets an API key, and can:
- Read public showrooms, products, events (no auth required)
- Write on behalf of a user (with their OAuth permission)
- Automate business workflows (post products, update orders, etc.)

**What to build:**
```
POST /api/developer/keys        → create API key
GET  /api/developer/keys        → list keys
DELETE /api/developer/keys/:id  → revoke key

All existing API routes accept:
  Authorization: Bearer hale_live_xxxxxxxxxxxx
  (in addition to the existing JWT flow)

Rate limiting per key:
  Free tier:    100 req/hour
  Pro tier:   1,000 req/hour
  Enterprise: 10,000 req/hour
```

### 2.2 "Login with Halehame" (OAuth 2.0)

Any website can add a "Continue with Halehame" button.

**Flow:**
```
1. Developer registers their app at halehame.vercel.app/developers
2. Gets client_id + client_secret
3. User clicks "Login with Halehame" on their site
4. Redirected to halehame.vercel.app/oauth/authorize?client_id=xxx
5. User approves → redirected back with auth_code
6. Developer exchanges code for access_token
7. Developer calls GET /api/auth/me with token → gets user profile
```

**Value:** Every site that adopts "Login with Halehame" sends their users to Halehame.
Halehame becomes identity infrastructure for African businesses.

### 2.3 Showroom Embed Widget

One line of code embeds a full showroom on any website:

```html
<script src="https://halehame.vercel.app/embed.js"></script>
<div data-halehame-showroom="my-business-slug"></div>
```

Renders the business's live showroom inside any website.
Updates automatically when the owner edits their showroom.

**Value:** Business owners share their Halehame showroom on their personal website,
Facebook page, or WhatsApp link. Halehame gets distribution everywhere.

### 2.4 Webhook System

Businesses and developers subscribe to events:

```
POST /api/developer/webhooks
{
  "url": "https://my-erp.com/webhook",
  "events": ["order.created", "order.paid", "task.completed", "message.received"]
}
```

When an event fires on Halehame, we POST to their URL instantly.

**Use cases:**
- ERP system updates inventory when an order is placed
- Accountant's system records revenue when payment is confirmed
- Notification service sends custom SMS when a task is completed

### 2.5 Developer Dashboard

A dedicated section of the admin/settings area:

```
/developers
  → My Apps (list of registered apps)
  → API Keys (create, revoke, view usage)
  → Webhooks (add/remove/test)
  → Analytics (API call volume, error rates)
  → Documentation (link to API docs)
```

---

## Layer 3 — Business Infrastructure

What makes Halehame essential infrastructure for any business, not just a social app.

### 3.1 Halehame Payments API

Any external website can accept payment via a customer's Halehame wallet:

```
POST /api/payments/charge
{
  "amount": 500,
  "currency": "ETB",
  "description": "Order #12345",
  "customer_halehame_id": "user_uuid",
  "callback_url": "https://my-site.com/payment-success"
}
```

**Value:** For businesses in countries where card infrastructure is poor but
mobile money is universal, Halehame wallet becomes the payment layer.
This is how M-Pesa became infrastructure — by opening the payment API.

### 3.2 Halehame Notifications API

Send push notifications to Halehame users from external systems:

```
POST /api/notifications/send
{
  "user_id": "uuid",
  "title": "Your order shipped!",
  "body": "Your Order #456 is on the way.",
  "link": "https://my-shop.com/orders/456"
}
```

Any app with a Halehame user's ID can send them a notification.
They receive it in the Halehame notification center.

### 3.3 Halehame Verify (Identity)

Other platforms verify that a Halehame user is a real, verified human:

```
GET /api/verify/:user_id
→ { verified: true, badge: "verified", member_since: "2026-01" }
```

**Use cases:**
- Marketplace prevents fake accounts by requiring Halehame verification
- Lending platform checks Halehame history before approving a loan
- Event platform confirms identity for high-value tickets

---

## Layer 4 — Ecosystem

How Halehame becomes self-sustaining through the developer community.

### 4.1 Integration Marketplace

A public directory of apps and integrations built on Halehame:

```
/integrations
  → Shopify Sync         — import your Shopify products to Halehame
  → QuickBooks Connect   — sync orders to accounting
  → WhatsApp Gateway     — send order updates via WhatsApp
  → Telegram Bot         — manage Halehame from Telegram
  → Google Sheets Sync   — export orders to spreadsheet
  → WooCommerce Bridge   — connect WordPress store
```

Any developer can submit an integration. Verified integrations get a badge.

### 4.2 Revenue Sharing

Developers who drive transactions earn a percentage:

- Integration drives $10,000 in orders → developer earns 0.5% = $50
- "Login with Halehame" drives 1,000 new users → developer earns flat bonus
- Published course earns $5,000 → instructor earns 70%, Halehame earns 30%

### 4.3 Halehame for Developers Program

- **Free tier:** Public API access, 100 req/hour, community support
- **Pro tier ($29/mo):** 10,000 req/hour, webhooks, priority support
- **Enterprise (custom):** White-label, dedicated infrastructure, SLA

---

## The Flywheel

```
More users → More valuable platform
     ↑                    ↓
More developers  ←  More developer tools
build on platform       available
     ↑                    ↓
More integrations  → More businesses join
exist                  (their tools already connect)
```

This is exactly how Telegram grew from a messaging app to a platform.
And exactly how Stripe went from a payment library to financial infrastructure.

---

## Immediate Next Steps (Priority Order)

1. **Public API documentation** — document all 42 existing routes in OpenAPI format
2. **API key system** — add `api_keys` table + middleware to accept bearer keys
3. **Webhook system** — `webhook_subscriptions` table + event emitter
4. **Developer dashboard** — frontend page for key/webhook management
5. **OAuth 2.0 server** — "Login with Halehame" for external sites
6. **Embed widget** — `<script>` tag showroom embed
7. **Integration marketplace** — public directory of built integrations
8. **Revenue sharing** — developer payment infrastructure

---

## What Makes This Different from "Just an API"

The difference between Telegram and a typical API:

| Typical API | Platform Strategy |
|---|---|
| Developers call your data | Developers BUILD on your infrastructure |
| You control all UX | Developers create new UX inside your platform |
| Revenue from subscriptions | Revenue from the ecosystem's transactions |
| You must build every feature | The community builds features for you |
| Limited by your team's speed | Scales with developer community |

Halehame's goal: **by 2028, more than half of Halehame's valuable features are built
by third-party developers, not the core team.**

That is the Telegram model.
That is the Apple App Store model.
That is what separates a great app from a platform.

---

*Aligned with: v3.0 Scale & Growth in docs/strategy/IMPLEMENTATION_ORDER.md*
*This document defines the commercial and strategic direction underlying all technical decisions.*
