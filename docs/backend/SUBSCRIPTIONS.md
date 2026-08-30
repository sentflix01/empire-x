# Backend — Subscription Tiers API Reference

> Covers the subscription lifecycle, tier enforcement, and all related endpoints.
> See also: `docs/decisions/subscription-tiers-decisions.md`

---

## Tiers

| Tier | Label | Price | Products | Storage | Showrooms |
|------|-------|-------|----------|---------|-----------|
| `freemium` | Free | $0 | 50 | 5GB | 1 |
| `premium` | Pro | $12/month | 10,000 | 50GB | 3 |
| `pro` | Enterprise | $49/month | Unlimited | 500GB | Unlimited |

---

## Environment Variables Required

```bash
# Stripe subscription billing (separate from order processing)
STRIPE_SUBSCRIPTION_WEBHOOK_SECRET=whsec_...   # from Stripe Dashboard → Webhooks

# Stripe price IDs (create in Stripe Dashboard → Products → Prices)
STRIPE_PRICE_PREMIUM_MONTHLY=price_...
STRIPE_PRICE_PRO_MONTHLY=price_...
```

---

## API Endpoints

### Subscription Management

#### `GET /api/subscriptions/plans`
Public. Returns all available plan definitions.

```json
{
  "freemium": { "tier": "freemium", "label": "Free", "priceUsd": 0, "features": [...] },
  "premium_monthly": { "tier": "premium", "label": "Pro", "priceUsd": 12, "features": [...] },
  "pro_monthly": { "tier": "pro", "label": "Enterprise", "priceUsd": 49, "features": [...] }
}
```

#### `GET /api/subscriptions/my`
Auth required. Returns caller's current subscription or `{ tier: "freemium" }` default.

```json
{
  "tier": "premium",
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

Request: `{ "plan": "premium_monthly" | "pro_monthly" }`
Response: `{ "checkout_url": "https://checkout.stripe.com/...", "session_id": "cs_..." }`

Business owner is redirected to `checkout_url`. On completion, Stripe fires a webhook that activates the tier.

#### `POST /api/subscriptions/cancel`
Auth required. Schedules cancellation at end of current billing period.

Response: `{ "success": true, "message": "..." }`

#### `POST /api/subscriptions/webhook`
Raw body required — registered BEFORE `express.json()` in `index.ts`.
Verifies `stripe-signature` header using `STRIPE_SUBSCRIPTION_WEBHOOK_SECRET`.

Handles: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`

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
