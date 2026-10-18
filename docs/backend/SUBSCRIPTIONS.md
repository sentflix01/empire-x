# Backend — Subscription Tiers API Reference

> Covers the subscription lifecycle, tier enforcement, and all related endpoints.
> See also: `docs/decisions/subscription-tiers-decisions.md`

---

## Tiers and prices

| Tier | Monthly price | Products | Storage | Showrooms |
|------|---------------|----------|---------|-----------|
| `freemium` | Free | 50 | 5GB | 1 |
| `normal` | ETB 100 or USD $1 | 50 | 5GB | 1 |
| `premium` | ETB 500 or USD $5 | 10,000 | 50GB | 3 |
| `pro` | ETB 1,000 or USD $10 | Unlimited | 500GB | Unlimited |
| `enterprise` | Custom in ETB or USD | By agreement | By agreement | By agreement |

Prices are fixed by currency, not converted at checkout. Stripe configuration
must provide a monthly recurring Price for each enabled tier/currency pair.
The public plans endpoint indicates which currencies are configured without
returning Stripe Price IDs.

---

## Environment Variables Required

USD plans run on Stripe Checkout (subscriptions); ETB plans are prepaid through Chapa (below).

```bash
FF_STRIPE_PAYMENTS=true
STRIPE_SECRET_KEY=sk_test_...                 # test period: sk_test_; later sk_live_
STRIPE_SUBSCRIPTION_WEBHOOK_SECRET=whsec_...  # Stripe Dashboard → Webhooks, endpoint /api/subscriptions/webhook

# Optional. Without them, USD checkout sends the published price (1 / 5 / 10 USD a month)
# as inline price_data. When set, the price must match the plan exactly or checkout is refused.
STRIPE_PRICE_NORMAL_MONTHLY_USD=price_...
STRIPE_PRICE_PREMIUM_MONTHLY_USD=price_...
STRIPE_PRICE_PRO_MONTHLY_USD=price_...
```

Webhook events to send:
- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid` (renewals extend the period)
- `invoice.payment_failed`

Older and current Stripe API versions both work: period dates are read from
the subscription or its first item, and from invoice lines
(`lib/stripeSubscriptionPeriod.ts`). Each event is processed once
(`webhook_events.id`).

**Test period (2026-10 → 2027-04):** both providers run on test keys in
production (`sk_test_…`, `CHASECK_TEST-…`), and no real money moves. The plan
page shows the providers' test cards and phone numbers. Going live is a key
swap only.

---

## API Endpoints

### Subscription Management

#### `GET /api/subscriptions/plans`
Public. Returns all available plan definitions.

```json
{
  "freemium": {
    "tier": "freemium",
    "label": "Free",
    "prices": { "ETB": 0, "USD": 0 },
    "currencyAvailability": { "ETB": true, "USD": true },
    "features": [...]
  },
  "normal_monthly": {
    "tier": "normal",
    "label": "Normal",
    "prices": { "ETB": 100, "USD": 1 },
    "currencyAvailability": { "ETB": false, "USD": false },
    "features": [...]
  },
  "enterprise": {
    "label": "Enterprise",
    "prices": { "ETB": null, "USD": null },
    "pricingCurrencies": ["ETB", "USD"],
    "contactRequired": true
  }
}
```

`currencyAvailability` is deployment-specific and becomes `true` only when the
matching Stripe Price ID is configured.

#### `GET /api/subscriptions/my`
Auth required. Returns caller's current subscription or `{ tier: "freemium" }` default.

```json
{
  "tier": "premium",
  "currency": "USD",
  "status": "active",
  "current_period_end": "2026-09-15T00:00:00Z",
  "cancel_at_period_end": false,
  "product_count": 142,
  "storage_used_bytes": 1073741824,
  "businessId": "uuid"
}
```

#### `POST /api/subscriptions/create`
Auth required. Creates a Stripe Checkout Session for subscription upgrade.

Request: `{ "plan": "normal_monthly" | "premium_monthly" | "pro_monthly", "currency": "ETB" | "USD" }`
Response: `{ "checkout_url": "https://checkout.stripe.com/...", "session_id": "cs_..." }`

Business owner is redirected to `checkout_url`. On completion, Stripe fires a webhook that activates the tier.
For backward compatibility, an omitted currency is treated as `ETB`; any
provided currency other than `ETB` or `USD` is rejected. Stripe Price currency,
amount, and monthly interval are validated against the selected plan before
creating a Checkout Session. The webhook stores the selected currency with the
subscription; existing subscriptions are migrated as `ETB`.

#### `POST /api/subscriptions/cancel`
Auth required. Schedules cancellation at end of current billing period.

Response: `{ "success": true, "message": "..." }`

#### `POST /api/subscriptions/webhook`
Raw body required — registered BEFORE `express.json()` in `index.ts`.
Verifies `stripe-signature` header using `STRIPE_SUBSCRIPTION_WEBHOOK_SECRET`.

Handles: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`

### Prepaid ETB through Chapa (Phase 1)

ETB plans are paid through Chapa (telebirr, CBE Birr, banks and cards in one
checkout). Chapa has no recurring charges, so owners **prepay** periods. When
Chapa is configured, `GET /plans` reports `currencyAvailability.ETB: true`,
`providers.ETB: "chapa"` and `prepayMonths: [1, 3, 6, 12]`. Stripe remains for
USD. Code: `routes/subscriptionsEtb.ts`, `lib/subscriptionPayments.ts`,
`lib/subscriptionBilling.ts`, `lib/chapaClient.ts`; table `subscription_payments` (migrate63).

**Pricing rules** (owner decisions 2026-10-17):

| Situation | Kind | Amount | New period |
|---|---|---|---|
| No paid period (or it ended) | `new` | monthly price × months | now → now + months |
| During the free legacy trial | `new` | monthly price × months | trial end → trial end + months (the plan's tier applies from payment) |
| Same plan, still paid | `renewal` | monthly price × months | current end → current end + months |
| Higher plan, still paid | `upgrade` | price difference × days left ÷ 30 (rounded up) + new price × added months | end unchanged, plus any added months |
| Lower plan, still paid | refused (`downgrade_not_allowed`) | — | change at the end of the period |

Months are 1, 3, 6 or 12 (an upgrade may add 0). While a Stripe subscription is
renewing itself, ETB checkout is refused (`stripe_subscription_active`).

**Confirmation.** A payment counts only after the backend verifies it with
Chapa's API. The webhook, the checkout `callback_url` and the owner's return
page (which polls `/payments/:ref/status`) all call the same idempotent
`confirmPayment`: under row locks it marks the payment paid once, recomputes
the period from the latest end date (so out-of-order payments extend
correctly), assigns a receipt number (`NB-YYYY-000001`), notifies the owner and
publishes the website draft the owner was publishing, if any. A payment Chapa
reports for less than the quote is marked `failed` and changes nothing.

| Endpoint | Auth | Purpose |
|---|---|---|
| `GET /api/subscriptions/quote?businessId=&plan=&months=` | owner | `{ kind, tier, months, amount, periodStart, periodEnd, currency: "ETB" }` |
| `POST /api/subscriptions/checkout` `{ business_id, plan, months, draft_id? }` | owner | `{ checkout_url, tx_ref, amount, kind, period_end }`; `503 etb_checkout_unavailable` when Chapa is not configured |
| `POST /api/subscriptions/webhook/chapa` | Chapa signature | `x-chapa-signature` = HMAC-SHA256 of the raw body with `CHAPA_WEBHOOK_SECRET`; `401` otherwise |
| `GET /api/subscriptions/chapa/callback?tx_ref=` | none | Chapa's callback; only triggers re-verification |
| `GET /api/subscriptions/payments?businessId=` | owner | billing history (abandoned checkouts older than a day are hidden); pending rows under a day old carry `checkout_url` |
| `GET /api/subscriptions/payments/:tx_ref/status` | owner | re-verifies and returns `status` (`pending`/`paid`/`failed`/`expired`), `receipt_number`, `period_end`, `business_id`, and `checkout_url` while the payment is pending and under a day old |
| `GET /api/subscriptions/payments/:id/receipt` | owner | receipt data for a paid payment |

Demo sessions get `403 DEMO_PAYMENTS_UNAVAILABLE` on all owner endpoints.

**Environment:**

```bash
CHAPA_SECRET_KEY=CHASECK_TEST-...    # live: CHASECK-...; "SANDBOX" = fake checkout outside production
CHAPA_WEBHOOK_SECRET=...             # Chapa dashboard → Settings → Webhooks → secret hash
API_URL=https://nodbusiness-backend-9psf.onrender.com   # callback and sandbox URLs
```

**Owner screens** (frontend): the plan page (`/business/subscription`) opens a prepay panel with the server's quote (`components/business/ChapaCheckoutPanel.tsx`), lists **Billing history** with receipts, shows "Paid until" and **Renew** for prepaid plans (no Cancel: nothing renews automatically). Chapa returns the owner to `/business/subscription/return?tx_ref=…` (only `tx_ref`: Chapa HTML-escapes `&` in the return URL, so the page takes the business from the status response). The page polls the status endpoint ("Checking your payment…") and links the receipt (`/business/subscription/receipt/:id`, with PDF download) and the newly published website.

Set the Chapa dashboard webhook URL to
`https://<backend>/api/subscriptions/webhook/chapa`. With
`CHAPA_SECRET_KEY=SANDBOX` (never in production) the checkout URL opens a local
sandbox page whose "Pay with test telebirr" button marks the payment paid.

**Unfinished payments.** The Chapa checkout page is stored on the payment
(`subscription_payments.checkout_url`, migrate65). While a payment is pending
and under a day old, the return page and the Billing history row show
**Continue payment** (back to the same Chapa page; Chapa never charges one
`tx_ref` twice) and the return page also shows **Check again**.

**Test mode.** `GET /api/subscriptions/plans` gives each paid plan
`testMode: { ETB, USD }`, true only with test keys (`CHAPA_SECRET_KEY` of
`SANDBOX` or `CHASECK_TEST-…`; Stripe `sk_test_…`, with USD configured). The
checkout panel and return page then show Chapa's published test phone numbers
and cards (and, on the USD path, Stripe's test cards) with one-tap Copy
(`components/business/TestModeHelper.tsx`, `lib/paymentTestData.ts`). They are
never shown with live keys; no key is exposed.

### Expiry and unpaid-draft lifecycle

Runs every 15 minutes (`subscription-lifecycle` job, `scripts/business-subscription-lifecycle.js`).

- **3 days before** a prepaid plan or a free (trialing) period ends, the owner gets
  "Your plan ends soon" / "Your free period ends soon" in the app and by email,
  once per period, with a Renew link. Stripe subscriptions renew themselves and
  are skipped.
- Subscription notices are sent on days 0, 3, 7, 9, and 10 after the paid period
  ends, **in the app and by email**. The in-app notice is claimed separately
  (`<notice>:app` in `business_subscription_notices`), so it is delivered once even
  when email fails, while the email is retried on the next run.
- The website is hidden after the 24-hour grace period. If it remains unpaid after
  the final day-10 notice, the business and its products are permanently deleted,
  and the owner is blocked from creating a new business for one month. Removal
  still requires the day-10 email to have been sent.
- **A payment in flight protects the business.** From day 9, before any removal,
  the job re-checks the business's unconfirmed payments from the last 3 days with
  Chapa: a confirmed one extends the period (nothing is removed); one still
  pending postpones removal to a later run. A failed check also postpones.
- Each run first gives checkouts left pending for over a day one last check with
  Chapa (a late payment still counts), then marks the rest `expired`.
- An unpublished website draft is reminded at 24, 48, and 72 hours; it is deleted
  only after the final reminder succeeds.
- Draft reminders show the plan price in both ETB and USD.

---

### Live Location (Enterprise)

#### `POST /api/locations/update`
Auth + Enterprise tier required (`checkTierLimit('live_location_tracking')`).

Request: `{ "lat": 9.019, "lng": 38.752, "label": "Driver A", "accuracy_m": 10, "heading": 45, "speed_kmh": 30 }`

- UPSERTs into `live_locations` (one row per business)
- Broadcasts to Socket.IO room `business:{business_id}:tracking`

#### `GET /api/locations/:businessId`
Public. Returns last known location if updated within 10 minutes.

```json
{ "available": true, "lat": 9.019, "lng": 38.752, "label": "Driver A", "updated_at": "..." }
```

---

### Business Webhooks (Premium+)

#### `GET /api/business-webhooks`
Auth + Premium tier required. Lists registered webhook endpoints (secret NOT returned).

#### `POST /api/business-webhooks`
Auth + Premium tier required.

Request: `{ "url": "https://yourdomain.com/webhook", "events": ["order.created", "product.low_stock"] }`
Response includes the `secret` — **only returned at creation time**.

Available event types: `order.created`, `order.status_changed`, `product.low_stock`, `product.created`, `product.updated`, `booking.created`, `review.created`

Outgoing requests include: `X-Nodbusiness-Signature: <HMAC-SHA256>`, `X-Nodbusiness-Event: <event_type>`

#### `PUT /api/business-webhooks/:id` — update URL / events / enabled state
#### `DELETE /api/business-webhooks/:id` — delete endpoint

---

### Business API Keys (Premium+)

#### `GET /api/business-api-keys`
Auth + Premium tier required. Lists keys with `key_prefix` shown, `key_hash` hidden.

#### `POST /api/business-api-keys`
Auth + Premium tier required. Max 5 active keys per business.

Request: `{ "name": "My Integration", "scope": "read" | "read_write", "expires_in_days": 365 }`

Response includes `key` field — **plaintext shown ONCE, never again**.

#### `DELETE /api/business-api-keys/:id` — revoke key (sets is_active = false)

---

### Product Bulk Import (Premium+)

#### `POST /api/products/bulk-import`
Auth + Premium tier required. Max 1,000 rows per request.

Request: JSON array of product objects. Required: `title`, `price`. Optional: `description`, `category`, `currency`, `stock`, `images`, `barcode`, and 20+ more fields.

Response: `{ "created": 95, "errors": [{ "index": 2, "reason": "price must be >= 0" }] }`

Partial success is allowed — valid rows are created even if some rows fail.

---

## Tier Enforcement Middleware

```typescript
import { checkTierLimit } from '../middleware/tierLimit';

// Gate a route behind Premium tier
router.post('/my-route', requireAuth, checkTierLimit('bulk_import'), handler);
```

On 403, returns:
```json
{
  "error": "upgrade_required",
  "currentTier": "freemium",
  "requiredTier": "premium",
  "feature": "bulk_import"
}
```

Feature → Minimum tier mapping:

| Feature | Minimum Tier |
|---------|-------------|
| `bulk_import` | premium |
| `webhooks` | premium |
| `api_keys` | premium |
| `analytics` | premium |
| `builder_premium` | premium |
| `external_data_sources` | premium (create, edit, map; disable and delete stay open) |
| `live_location_tracking` | pro |
| `builder_pro` | pro |

---

## Emitting Business Webhooks from Other Routes

```typescript
import { emitBusinessWebhook } from './businessWebhooks';

// In orders.ts after order is created:
await emitBusinessWebhook(businessId, 'order.created', { orderId, total, status });
```

Fire-and-forget — failures are logged but don't affect the calling route.
