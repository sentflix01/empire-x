# Subscription Tiers — Engineering Decisions

> Documents the key architectural choices made when implementing the business-subscription-tiers feature.
> See also: `docs/backend/SUBSCRIPTIONS.md`, `.kiro/specs/business-subscription-tiers/design.md`

---

## Decision 1: Redis Cache for Tier Checks (sub:{business_id}, TTL 300s)

**Problem:** Every gated API endpoint would need a DB round-trip to check the business's subscription tier, adding latency to every request.

**Decision:** Cache the subscription state in Redis using key `sub:{business_id}` with a 300-second TTL. On cache miss, query `business_subscriptions` and populate the cache. Default to `freemium` if no row exists (backward compatible with all existing businesses).

**Trade-off:** A tier change takes up to 5 minutes to propagate. This is acceptable because:
1. Stripe webhook calls `invalidateSubCache()` immediately on payment confirmation
2. Cancellations are also immediately invalidated
3. 5-minute delay is only for edge cases (e.g., direct DB update)

**Files:** `backend/middleware/tierLimit.ts`, `backend/lib/redis.ts`

---

## Decision 2: Idempotent Stripe Webhook via webhook_events Table

**Problem:** Stripe retries webhook delivery. Processing the same event twice could double-charge or double-activate a subscription.

**Decision:** Use the existing `webhook_events` table pattern from `routes/orders.ts`:
- `INSERT INTO webhook_events (event_id, ...) ON CONFLICT (event_id) DO NOTHING`
- If no row inserted → duplicate delivery, return `{ received: true, duplicate: true }` immediately
- Subscription webhook uses a separate secret (`STRIPE_SUBSCRIPTION_WEBHOOK_SECRET`) from order webhooks

**Files:** `backend/routes/subscriptions.ts`

---

## Decision 3: Hash-Only API Key Storage (SHA-256, Never Stored Plaintext)

**Problem:** Business API keys grant access to business data. Storing plaintext keys in the DB creates a single point of compromise.

**Decision:** 
- Generate: `crypto.randomBytes(32).toString('hex')` → 64-character hex key
- Store: `SHA-256(plaintext)` hash only. The plaintext is returned ONCE at creation and never again.
- Display: first 8 characters (`key_prefix`) stored for UI identification
- Verify: incoming key requests compute SHA-256 and compare to stored hash

This mirrors how password hashing works — the DB breach doesn't expose usable keys.

**Files:** `backend/routes/businessApiKeys.ts`

---

## Decision 4: SSRF Protection on Webhook URLs

**Problem:** A business could register an internal URL (e.g., `http://localhost:3001/internal`) as a webhook endpoint, causing the server to make requests to itself or internal services.

**Decision:** Reuse the SSRF protection pattern from `routes/externalSources.ts` (already built for showroom external data sources):
- Block non-HTTPS URLs
- Block `localhost`, `0.0.0.0`, IPv4 private ranges (10.x, 172.16-31.x, 192.168.x), loopback (127.x), link-local (169.254.x)
- Validation happens at registration time (not just at delivery time)

**Files:** `backend/routes/businessWebhooks.ts`

---

## Decision 5: Fail-Closed Tier Enforcement

**Problem:** If the Redis lookup or DB query fails during tier enforcement, should we allow or deny the request?

**Decision:** Fail closed — default to `freemium` (most restrictive) on any error. This prevents a Redis outage from accidentally granting Enterprise features to Free users. The trade-off is that a Redis outage causes false 403s for paid users, but this is safer than the alternative.

**Files:** `backend/middleware/tierLimit.ts` (catch block)

---

## Decision 6: Explicit Stripe Price IDs per Plan, Currency, and Environment

**Problem:** Test and live modes need different Stripe Price IDs, and ETB and USD prices must never be confused or converted implicitly.

**Decision:** Plan definitions in `subscriptionPlans.ts` read price IDs from env vars:
- `STRIPE_PRICE_NORMAL_MONTHLY_ETB` / `STRIPE_PRICE_NORMAL_MONTHLY_USD`
- `STRIPE_PRICE_PREMIUM_MONTHLY_ETB` / `STRIPE_PRICE_PREMIUM_MONTHLY_USD`
- `STRIPE_PRICE_PRO_MONTHLY_ETB` / `STRIPE_PRICE_PRO_MONTHLY_USD`

The agreed fixed prices are Normal (ETB 100 or USD $1), Premium (ETB 500 or
USD $5), and Pro (ETB 1,000 or USD $10) per month. Enterprise is custom-priced
in either currency. The backend verifies every configured Stripe Price against
the selected currency, amount, and monthly interval before creating checkout.
Old unscoped Price ID variables are not used as fallbacks. Subscription currency
is stored with each subscription; existing records default to ETB.

Plans are defined as TypeScript constants (not in DB) to avoid tier drift.
Adding currency persistence requires a migration, while adding another plan
also requires explicit per-currency Stripe configuration.

**Files:** `backend/lib/subscriptionPlans.ts`

---

## Files Touched by This Feature

| File | Change |
|------|--------|
| `backend/db/migrate37.js` | New: 4 tables (business_subscriptions, live_locations, business_webhooks, business_api_keys) |
| `backend/lib/subscriptionPlans.ts` | New: tier/feature constants, plan definitions |
| `backend/middleware/tierLimit.ts` | New: checkTierLimit() middleware factory |
| `backend/routes/subscriptions.ts` | New: 5 subscription endpoints + Stripe webhook handler |
| `backend/db/migrate51.js` | Adds subscription currency with existing records defaulted to ETB |
| `backend/routes/locations.ts` | New: POST /api/locations/update |
| `backend/routes/businessWebhooks.ts` | New: CRUD + HMAC signing + emitBusinessWebhook helper |
| `backend/routes/businessApiKeys.ts` | New: API key management (hash-only storage) |
| `backend/routes/products.ts` | Modified: added checkTierLimit import + bulk-import route was already present |
| `backend/socket.ts` | Modified: added join_business_tracking / leave_business_tracking handlers |
| `backend/index.ts` | Modified: registered 4 new routes + raw body for subscription webhook |
| `frontend-next/lib/builderSections.ts` | Modified: tierLabel/tierFeatures fields + inventory_catalog + live_location_tracking sections |
| `frontend-next/components/subscription/UpgradePromptModal.tsx` | New |
| `frontend-next/components/subscription/TierGatedSection.tsx` | New |
| `frontend-next/components/showroom/LiveLocationSection.tsx` | New |
| `frontend-next/views/BusinessSubscription.tsx` | New |
| `frontend-next/views/BusinessInventory.tsx` | New |
| `frontend-next/app/(app)/business/subscription/page.tsx` | New route |
| `frontend-next/app/(app)/business/inventory/page.tsx` | New route |
