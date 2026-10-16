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

```bash
# Stripe subscription billing (separate from order processing)
STRIPE_SUBSCRIPTION_WEBHOOK_SECRET=whsec_...   # from Stripe Dashboard → Webhooks

# Stripe price IDs (create in Stripe Dashboard → Products → Prices)
STRIPE_PRICE_NORMAL_MONTHLY_ETB=price_...
STRIPE_PRICE_NORMAL_MONTHLY_USD=price_...
STRIPE_PRICE_PREMIUM_MONTHLY_ETB=price_...
STRIPE_PRICE_PREMIUM_MONTHLY_USD=price_...
STRIPE_PRICE_PRO_MONTHLY_ETB=price_...
STRIPE_PRICE_PRO_MONTHLY_USD=price_...
```

Create each recurring price in Stripe for the matching plan amount and currency.
Test and live mode use separate Stripe keys and Price IDs. The former
`STRIPE_PRICE_NORMAL_MONTHLY`, `STRIPE_PRICE_PREMIUM_MONTHLY`, and
`STRIPE_PRICE_PRO_MONTHLY` variables are not used as fallback values; configure
the currency-specific IDs explicitly.

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

Handles: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`. Subscribe the Stripe webhook endpoint to all five; without `invoice.paid` renewals rely on `customer.subscription.updated` alone.

- **Idempotency:** each event id is claimed with `INSERT INTO webhook_events (id,type) … ON CONFLICT (id) DO NOTHING RETURNING id` (same ledger and pattern as the order webhook). Duplicates get `{ received: true, duplicate: true }`; if handling fails the claim is deleted and a 500 is returned so Stripe redelivers.
- **Billing period:** the pinned Stripe API (`2026-09-30` via `stripe@23`) reports `current_period_start/end` on subscription items, not on the subscription. The handler uses the item with the latest `current_period_end`; a missing period is stored as "unchanged", never as an invalid date.
- **Renewals:** `invoice.paid` re-reads the subscription from Stripe and moves `current_period_end` forward (and resets `status` from Stripe, e.g. `past_due` → `active`). If Stripe cannot be reached the event is retried. `customer.subscription.updated` and `invoice.paid` only ever move `current_period_end` forward (`GREATEST`), so a late, out-of-order event cannot pull it back. This matters because the subscription lifecycle job hides, blocks and finally deletes businesses whose `current_period_end` has lapsed.

### Expiry and unpaid-draft lifecycle

- Subscription notices are sent on days 0, 3, 7, 9, and 10 after the paid period ends.
- The website is hidden after the 24-hour grace period. If it remains unpaid after
  the final day-10 notice, the business and its products are permanently deleted,
  and the owner is blocked from creating a new business for one month.
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
