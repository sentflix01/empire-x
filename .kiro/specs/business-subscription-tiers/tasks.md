# Implementation Plan: Business Subscription Tiers

## Overview

Implement the three-tier subscription system (freemium / premium / pro) across database, backend, and frontend. The sequence follows data layer first, then enforcement middleware, then feature routes, then frontend components.

## Tasks

- [x] 1. Database migration — create 4 new tables
  - Create `backend/db/migrate37.js` following the pattern of migrate36.js
  - Add `business_subscriptions` table with tier/status/stripe columns and UNIQUE constraint on business_id
  - Add `live_locations` table with UNIQUE constraint on business_id
  - Add `business_webhooks` table with events TEXT[] column and HMAC secret column
  - Add `business_api_keys` table with key_hash (UNIQUE) and key_prefix columns
  - Add all indexes defined in the design (idx_bsub_stripe_sub, idx_bsub_business, idx_live_locations_business, idx_bwebhooks_business, idx_bapi_keys_business, idx_bapi_keys_hash)
  - Register migrate37 in `backend/db/migrate-all.js` following the existing auto-discovery pattern
  - _Requirements: 1.1, 3.1, 4.1, 5.1, 6.1_

- [x] 2. Subscription plan constants and tier enforcement middleware
  - [x] 2.1 Create `backend/lib/subscriptionPlans.ts` with PLANS constant and PlanKey type as defined in the design
  - Create `backend/middleware/tierLimit.ts` with `checkTierLimit(feature)` factory
  - Implement Redis cache lookup with key `sub:{business_id}` and TTL 300s
  - On cache miss: query `business_subscriptions` and populate Redis; if no row exists treat as freemium
  - Compare tier against `FEATURE_MIN_TIER` map and return 403 `{ error: 'upgrade_required', currentTier, requiredTier, feature }` or call `next()`
  - Export `TierFeature` type and `FEATURE_MIN_TIER` constant for use in property tests
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ]* 2.2 Write property test for tier enforcement (Property 3)
    - File: `backend/test/tierLimit.property.test.ts`
    - **Property 3: Tier enforcement — block and allow**
    - **Validates: Requirements 2.1, 2.2, 2.4**
    - Use `fc.record({ tier: fc.constantFrom('freemium','premium','pro'), feature: fc.constantFrom(...TierFeature values) })` as generator
    - Assert result matches `FEATURE_MIN_TIER[feature].includes(tier)` for 100 runs

- [x] 3. Subscription routes and Stripe webhook
  - Create `backend/routes/subscriptions.ts` with all 5 endpoints (GET /plans, GET /my, POST /create, POST /cancel, POST /webhook)
  - `GET /plans` returns PLANS constant (public, no auth)
  - `GET /my` queries `business_subscriptions` for the caller's business; returns `{ tier: 'freemium' }` if no row exists
  - `POST /create` validates plan key, looks up business_id from caller, calls `stripe.checkout.sessions.create` with price_id and metadata, returns `{ checkout_url }`
  - `POST /cancel` calls `stripe.subscriptions.update` with `cancel_at_period_end: true` and updates the DB row
  - `POST /webhook` uses raw body, verifies Stripe signature, follows idempotency pattern from `routes/orders.ts` (INSERT INTO webhook_events ON CONFLICT DO NOTHING), calls internal `handleSubscriptionEvent`
  - `handleSubscriptionEvent` handles `checkout.session.completed` and `customer.subscription.updated/deleted`: UPSERT `business_subscriptions`, invalidate Redis key `sub:{business_id}`, enqueue `usageRecalcQueue` job
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [ ]* 3.1 Write property test for subscription tier round-trip (Property 1)
    - File: `backend/test/subscriptions.property.test.ts`
    - **Property 1: Subscription tier round-trip**
    - **Validates: Requirements 1.3**
    - Generator: `fc.constantFrom('premium_monthly', 'pro_monthly')` as plan key
    - Assert after DB write and read-back, `tier` equals `PLANS[plan].tier`

  - [ ]* 3.2 Write property test for Stripe webhook confirms tier (Property 2)
    - File: `backend/test/subscriptions.property.test.ts` (same file, additional test)
    - **Property 2: Stripe webhook confirms tier**
    - **Validates: Requirements 1.2**
    - Generator: `fc.constantFrom('premium_monthly','pro_monthly')` combined with `fc.uuid()` as business_id
    - Call internal `handleSubscriptionEvent` with synthetic `checkout.session.completed` event and assert DB tier matches expected

  - [ ]* 3.3 Write property test for cancellation reverts tier at period end (Property 4)
    - File: `backend/test/subscriptions.property.test.ts` (same file, additional test)
    - **Property 4: Cancellation leaves tier until period end**
    - **Validates: Requirements 1.4**
    - Generator: `fc.record({ tier: fc.constantFrom('premium','pro'), periodEndOffset: fc.integer({ min: 1, max: 365 }) })`
    - Assert cancel sets `cancel_at_period_end=true` and tier is unchanged before `current_period_end`

- [x] 4. Register new routes in `backend/index.ts`
  - Add raw-body middleware for subscription webhook: `app.use('/api/subscriptions/webhook', express.raw({ type: 'application/json' }))` — must appear before the general `express.json()` line
  - Register `app.use('/api/subscriptions', require('./routes/subscriptions'))`
  - _Requirements: 1.1_

- [x] 5. Live location route and Socket.IO room
  - Create `backend/routes/locations.ts` with `POST /api/locations/update`
  - Apply `requireAuth` and `checkTierLimit('live_location_tracking')` middleware
  - UPSERT into `live_locations` with the posted lat/lng/label/accuracy_m
  - Call `getIO().to('business:{business_id}:tracking').emit('location_update', { lat, lng, label, updatedAt })`
  - Add Socket.IO event handlers in `backend/socket.ts` (or socket.js as appropriate): `join_business_tracking` verifies pro tier before adding socket to room; `leave_business_tracking` removes socket from room
  - Register `app.use('/api/locations', require('./routes/locations'))` in `backend/index.ts`
  - _Requirements: 3.1, 3.2, 3.3_

  - [ ]* 5.1 Write property test for live location broadcast (Property 5)
    - File: `backend/test/locations.property.test.ts`
    - **Property 5: Live location broadcast reaches room**
    - **Validates: Requirements 3.1, 3.2**
    - Generator: `fc.record({ lat: fc.float({ min: -90, max: 90 }), lng: fc.float({ min: -180, max: 180 }) })`
    - Mock `getIO()`, assert pro business triggers `emit('location_update', ...)` on the correct room; assert non-pro returns 403 without emitting

- [ ] 6. Business webhooks route and delivery queue
  - Create `backend/routes/businessWebhooks.ts` with CRUD endpoints (GET list, POST create, PUT update, DELETE delete)
  - Apply `checkTierLimit('webhooks')` on GET and POST; PUT and DELETE require auth and ownership check only
  - On POST: generate a random 32-byte hex secret, store it in `business_webhooks.secret`
  - Add `signWebhookPayload(payload, secret): string` helper using `crypto.createHmac('sha256', secret)`
  - Add `verifyWebhookSignature(signature, payload, secret): boolean` helper
  - Extend `backend/lib/queue.ts`: add `webhookDeliveryQueue` (attempts: 5, exponential backoff from 5s) and `usageRecalcQueue`; add their types (`WebhookDeliveryJobData`, `UsageRecalcJobData`) and export `queueWebhookDelivery` and `queueUsageRecalc` functions
  - Register `app.use('/api/business-webhooks', require('./routes/businessWebhooks'))` in `backend/index.ts`
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ]* 6.1 Write property test for HMAC sign/verify round-trip (Property 6)
    - File: `backend/test/webhooks.property.test.ts`
    - **Property 6: Webhook HMAC sign/verify round-trip**
    - **Validates: Requirements 4.3**
    - Generator: `fc.record({ payload: fc.string(), secret: fc.string({ minLength: 16 }) })`
    - Assert `verifyWebhookSignature(sign(payload, secret), payload, secret) === true` and verify with different secret always returns false

  - [ ]* 6.2 Write property test for webhook delivery to all enabled endpoints (Property 7)
    - File: `backend/test/webhooks.property.test.ts` (same file, additional test)
    - **Property 7: Webhook delivery to all enabled endpoints**
    - **Validates: Requirements 4.2**
    - Generator: `fc.array(fc.record({ url: fc.webUrl(), enabled: fc.boolean(), matchesEvent: fc.boolean() }), { minLength: 1, maxLength: 10 })`
    - Mock HTTP delivery; assert call count equals `webhooks.filter(w => w.is_enabled && w.events.includes(event)).length`

- [x] 7. Business API keys route
  - Create `backend/routes/businessApiKeys.ts` with GET list (masked), POST create, DELETE revoke
  - Apply `checkTierLimit('api_keys')` on GET and POST
  - On POST: generate a random 32-byte hex key, compute `key_hash = SHA-256(key)`, store `key_prefix = key.slice(0,8)`, return the plaintext key once in the response body — never store it
  - On GET: return rows with `key_hash` omitted from response (return id, name, key_prefix, last_used_at, is_active, created_at)
  - Register `app.use('/api/business-api-keys', require('./routes/businessApiKeys'))` in `backend/index.ts`
  - _Requirements: 6.1, 6.2, 6.3_

  - [ ]* 7.1 Write property test for API key hash storage (Property 9)
    - File: `backend/test/apiKeys.property.test.ts`
    - **Property 9: API key hash storage**
    - **Validates: Requirements 6.1**
    - Generator: `fc.string({ minLength: 10 })` as business_id
    - Assert `key_hash === crypto.createHash('sha256').update(plaintext).digest('hex')` and `key_hash` column does not contain plaintext

- [x] 8. Bulk import endpoint
  - Add `POST /bulk-import` route handler inside `backend/routes/products.ts`
  - Apply `requireAuth` and `checkTierLimit('bulk_import')` middleware
  - Accept JSON array of product rows; validate each row (title required, price must be ≥ 0, currency must be non-empty string)
  - Insert valid rows with a single transaction; collect one error object per invalid row with `{ index, reason }`
  - Return `{ created: number, errors: Array<{ index, reason }> }` — partial success is allowed
  - _Requirements: 5.1, 5.2, 5.3_

  - [ ]* 8.1 Write property test for bulk import partial success (Property 8)
    - File: `backend/test/bulkImport.property.test.ts`
    - **Property 8: Bulk import partial success**
    - **Validates: Requirements 5.1**
    - Generator: `fc.array(fc.record({ title: fc.option(fc.string({ minLength: 1 })), price: fc.option(fc.float({ min: -10, max: 10000 })) }), { minLength: 1, maxLength: 50 })`
    - Assert created count equals valid-row count, error count equals invalid-row count, created + error sets are disjoint

- [x] 9. Checkpoint — ensure all backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. `builderSections.ts` extensions
  - Add optional `tierLabel?: string` and `tierFeatures?: string[]` fields to the `SectionType` interface in `frontend-next/lib/builderSections.ts`
  - Add `tierLabel` and `tierFeatures` values to the existing premium and pro section entries where missing
  - Append the two new section types (`inventory_catalog` and `live_location_tracking`) to the `SECTION_TYPES` array exactly as specified in the design, both with `tier: 'pro'`
  - _Requirements: 2.5, 7.1_

- [x] 11. Frontend: `UpgradePromptModal` component
  - Create `frontend-next/components/subscription/UpgradePromptModal.tsx`
  - Accept props: `open: boolean`, `onClose: () => void`, `feature: string`, `currentTier: string`, `requiredTier: string`
  - Display the feature name, current tier, required tier, and a CTA button that navigates to `/business/subscription`
  - Use existing `Dialog` component from `components/ui/` if available
  - _Requirements: 2.4_

- [x] 12. Frontend: `TierGatedSection` wrapper component
  - Create `frontend-next/components/subscription/TierGatedSection.tsx`
  - Accept props: `feature: string`, `children: React.ReactNode`
  - On render, if the API call returns a 403 with `error === 'upgrade_required'`, intercept and render `UpgradePromptModal` instead of children
  - Provide a `useTierGate(feature)` hook inside the same file or a sibling file that returns `{ allowed: boolean, upgradeReason }` by calling `GET /api/subscriptions/my` and comparing against `FEATURE_MIN_TIER`
  - _Requirements: 2.4, 2.5_

- [x] 13. Frontend: `SubscriptionManagementPage`
  - Create `frontend-next/app/(app)/business/subscription/page.tsx`
  - Fetch current subscription from `GET /api/subscriptions/my`
  - Display current tier, status, and billing period
  - Render plan cards for premium and pro using data from `GET /api/subscriptions/plans`
  - Upgrade button calls `POST /api/subscriptions/create` with the selected plan and redirects to the returned `checkout_url`
  - Cancel button calls `POST /api/subscriptions/cancel` and updates UI to show `cancel_at_period_end` notice
  - _Requirements: 1.1, 1.2, 1.4_

- [x] 14. Frontend: `BusinessInventoryDashboard`
  - Create `frontend-next/app/(app)/business/inventory/page.tsx`
  - Display product list fetched from `GET /api/products` filtered to the current business
  - Add a "Bulk Import" button visible only to premium/pro users (wrap in `TierGatedSection feature="bulk_import"`)
  - Bulk import UI: textarea or file input accepting JSON array; POST to `/api/products/bulk-import`; display created count and per-row errors
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 15. Frontend: `LiveLocationSection` showroom component
  - Create `frontend-next/components/showroom/LiveLocationSection.tsx`
  - Connect to the Socket.IO server and emit `join_business_tracking` with the business_id on mount
  - Listen for `location_update` events and render the lat/lng (use a static map embed or plain coordinate display — no external map library required if none is already installed)
  - Emit `leave_business_tracking` and disconnect on unmount
  - _Requirements: 3.3_

- [x] 16. Final checkpoint — ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests use fast-check with minimum 100 runs (`fc.assert(..., { numRuns: 100 })`)
- Each property test file includes the comment: `// Feature: business-subscription-tiers, Property N: <property text>`
- The raw-body middleware for `/api/subscriptions/webhook` must be registered in `index.ts` before the general `express.json()` line — see task 4
