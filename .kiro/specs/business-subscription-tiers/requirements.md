# Requirements: Business Subscription Tiers

## Introduction

Nodbusiness needs a subscription tier system that gates showroom builder sections and business capabilities based on what each business owner pays for. This enables the platform to generate recurring revenue while giving every business owner a clear upgrade path as their needs grow — from a simple free showroom to a full enterprise commerce and logistics platform.

The system must feel like a natural extension of the existing builder — not a paywall, but a growth ladder. Business owners see all possibilities upfront and unlock them progressively.

---

## User Stories

### Requirement 1: Subscription Lifecycle Management

**User Story:** As a business owner, I want to subscribe to a paid tier, upgrade or downgrade at any time, and have my builder capabilities update immediately, so that I can match my subscription to my actual business needs.

#### Acceptance Criteria

1. The system SHALL provide three subscription tiers: Free, Pro ($12/month), and Enterprise ($49/month).
2. When a business owner subscribes to Pro or Enterprise, the system SHALL create a Stripe Subscription and store the subscription record in a `business_subscriptions` table linked to `businesses.id`.
3. When Stripe confirms a subscription payment via webhook, the system SHALL immediately update the business tier to the paid level — no manual activation required.
4. When a business owner cancels, the system SHALL keep the paid tier active until the end of the current billing period, then downgrade to Free.
5. When a payment fails (Stripe `invoice.payment_failed`), the system SHALL send a push notification and email to the business owner and set subscription status to `past_due`.
6. The system SHALL support upgrading from Pro to Enterprise mid-cycle with prorated billing via Stripe.
7. The system SHALL support downgrading from Enterprise to Pro or Free at the end of the billing period.

---

### Requirement 2: Tier Limits and Enforcement

**User Story:** As a business owner on the Free tier, I want to see exactly what I can and cannot do, and be guided to upgrade when I hit a limit, so that I never feel blocked without a clear path forward.

#### Acceptance Criteria

1. **Free tier limits:** 5 builder sections, 1 showroom, 50 products, 5GB storage.
2. **Pro tier limits:** 25 sections, 3 showrooms, 10,000 products, 50GB storage.
3. **Enterprise tier limits:** Unlimited sections, showrooms, products; 500GB storage.
4. When a Free owner tries to add a 6th section, the system SHALL show an upgrade prompt modal instead of adding the section.
5. When a Free owner tries to create a second showroom, the system SHALL show an upgrade prompt.
6. When any owner's product count reaches 80% of their tier limit, the system SHALL send a push notification: "You've used X of your Y product limit. Upgrade to unlock more."
7. When any owner's storage reaches 80% of their tier limit, the system SHALL send a push notification about storage usage.
8. The system SHALL track `product_count` and `storage_used_bytes` in `business_subscriptions` and update them on every product create/delete and file upload/delete.

---

### Requirement 3: Tier-Gated Builder Sections

**User Story:** As a business owner, I want to see all available builder sections and understand which ones require an upgrade, so that I know what I'm getting when I pay for a higher tier.

#### Acceptance Criteria

1. The builder SHALL display all section types in three visual groups: Unlocked (fully editable), Pro (amber lock icon, upgrade prompt on click), Enterprise (purple badge, enterprise prompt on click).
2. When an owner clicks a locked section, the system SHALL display a modal with: section name, key features (3–4 bullet points), the tier required, and a one-click upgrade button.
3. The upgrade button in the modal SHALL open the Stripe Checkout flow for the required tier.
4. After a successful upgrade, the previously locked section SHALL become immediately editable without requiring a page refresh.
5. The following sections SHALL be Pro-gated: `inventory_catalog`, `booking`, `caseStudies`, `partners`, `awards`, `careers`, `industries`, external data sources.
6. The following sections SHALL be Enterprise-gated: `live_location_tracking`, `fleet_status`, `api_integration`.
7. Free tier owners SHALL have access to: `hero`, `about`, `items`, `gallery`, `contact`, `social`, `map` (7 sections, max 5 active).

---

### Requirement 4: Inventory Catalog Section (Pro)

**User Story:** As a supermarket, pharmacy, or hardware store owner, I want a showroom section that automatically displays my product inventory with categories, search, and real-time stock, so that customers can browse my full catalog without me manually maintaining a static list.

#### Acceptance Criteria

1. The system SHALL add a new section type `inventory_catalog` to the builder that links to the business's products in the `products` table via `business_id`.
2. When rendered on the public showroom, the `inventory_catalog` section SHALL display products with: image, title, price, stock status (In Stock / Low Stock / Out of Stock), category badge.
3. The section SHALL support category filtering — customers can filter by product category without page reload.
4. The section SHALL support search within the catalog — searches by product title and description.
5. The section SHALL paginate results showing 24 products per page with cursor-based navigation.
6. The `inventory_catalog` section SHALL automatically reflect changes when the business owner adds/edits/deletes products — no manual section update needed.
7. The builder form for this section SHALL allow the owner to configure: display title, items per row (2/3/4), default sort (price/newest/name), and which categories to show/hide.

---

### Requirement 5: Business Inventory Dashboard (Pro)

**User Story:** As a business owner with a large product catalog, I want a dedicated inventory management dashboard where I can manage thousands of products efficiently, so that I don't have to manage them one by one through the marketplace product form.

#### Acceptance Criteria

1. The system SHALL provide a `/business/inventory` page accessible to business owners.
2. The inventory dashboard SHALL display a paginated, searchable, sortable table of all products belonging to the owner's business.
3. The dashboard SHALL support bulk CSV/Excel import: owner uploads a file with columns (title, price, category, stock, barcode, image_url, description) and up to 1,000 products are created in one operation.
4. The import SHALL validate each row and return a per-row success/error report — partial imports are allowed (valid rows succeed, invalid rows are skipped with error details).
5. The dashboard SHALL support bulk actions: select multiple products → set status (active/out_of_stock/hidden), apply discount, delete.
6. The dashboard SHALL show a summary bar: total products, active products, low stock count, out of stock count.
7. The dashboard SHALL show a sales analytics panel: revenue per product (last 30 days), units sold, top 10 best sellers — using the existing orders data.

---

### Requirement 6: Live Location Tracking Section (Enterprise)

**User Story:** As a ride service or delivery business owner, I want my showroom to show customers the real-time location of available drivers or delivery agents, and allow customers to request a pickup, so that my showroom becomes my operational interface.

#### Acceptance Criteria

1. The system SHALL add a new section type `live_location_tracking` that shows a live map with driver/agent pins updated in real time.
2. The system SHALL provide a `POST /api/locations/update` endpoint that authenticated drivers/agents call every 5 seconds with `{lat, lon, accuracy, heading, speed}`.
3. The backend SHALL broadcast location updates via Socket.IO to the room `business:{business_id}:tracking`.
4. The public showroom section SHALL subscribe to the Socket.IO room and update driver pins on the map without page reload.
5. The section SHALL show: count of available drivers, estimated wait time (based on nearest driver distance), and a "Request Pickup" button.
6. The "Request Pickup" button SHALL create a task in the existing tasks system with `task_type = 'ride'` or `task_type = 'delivery'` pre-filled.
7. The system SHALL store the last known location per user in a `live_locations` table and clean up locations older than 10 minutes as stale.
8. Location data SHALL NOT be visible to the public — only aggregate counts and ETAs are shown on the public showroom.

---

### Requirement 7: Webhook Outbound System (Enterprise)

**User Story:** As an Enterprise business owner with my own backend systems, I want to receive real-time event notifications when things happen on Nodbusiness (new order, low stock, new booking), so that I can keep my own systems in sync without polling the API.

#### Acceptance Criteria

1. The system SHALL allow Enterprise business owners to register up to 10 webhook endpoints in their dashboard, each with: URL (HTTPS only), event types (selectable from: `order.created`, `order.status_changed`, `product.low_stock`, `booking.created`, `review.created`), and a description.
2. When a registered event occurs, the system SHALL POST to the registered URL within 5 seconds with a JSON payload and `X-Nodbusiness-Signature` HMAC-SHA256 header using the business's webhook secret.
3. The system SHALL retry failed webhook deliveries up to 3 times with exponential backoff (1min, 5min, 30min).
4. The dashboard SHALL show webhook delivery logs: timestamp, event type, HTTP status, response time, and success/failure status.
5. The system SHALL allow owners to manually re-send any webhook event from the delivery log.
6. Webhook URLs SHALL be validated as HTTPS and blocked from internal network addresses (same SSRF protection as the external data sources feature).

---

### Requirement 8: Business API Keys (Enterprise)

**User Story:** As an Enterprise business owner, I want to generate API keys to access my own business data programmatically, so that I can build custom integrations, mobile apps, or third-party tools on top of my Nodbusiness data.

#### Acceptance Criteria

1. The system SHALL allow Enterprise business owners to generate up to 5 API keys from their dashboard.
2. Each API key SHALL have: a name/description, permissions scope (read-only or read-write), and an optional expiry date.
3. API keys SHALL provide access to: `GET /api/business/{id}/products`, `GET /api/business/{id}/orders`, `GET /api/business/{id}/analytics`, `POST /api/business/{id}/products` (if read-write scope).
4. API key requests SHALL be rate-limited at 1,000 requests/hour per key.
5. The system SHALL log every API key request with: timestamp, endpoint, method, IP, and response status.
6. Business owners SHALL be able to revoke any API key immediately from the dashboard.
7. API keys SHALL never be shown in full after creation — only the first/last 4 characters displayed; full key shown once at creation time.

---

### Requirement 9: Subscription Management Page

**User Story:** As a business owner, I want a clear page showing my current plan, usage, billing history, and upgrade/downgrade options, so that I always know what I'm paying for and can manage my subscription without contacting support.

#### Acceptance Criteria

1. The system SHALL provide a `/business/subscription` page for all business owners.
2. The page SHALL show: current tier name, monthly price, next billing date, usage bars for products (used/limit) and storage (used/limit).
3. The page SHALL show a feature comparison table for all three tiers with the current tier highlighted.
4. The page SHALL allow one-click upgrade to a higher tier (opens Stripe Checkout).
5. The page SHALL allow cancellation with a confirmation step that shows: what will be lost at downgrade and when it takes effect.
6. The page SHALL show billing history: last 12 invoices with date, amount, and PDF download link (via Stripe's invoice API).
7. When storage usage exceeds 90% of the tier limit, the page SHALL show a red warning banner with an immediate upgrade button.

---

## Non-Functional Requirements

1. **Performance:** Tier checks on API requests SHALL add no more than 5ms latency (checked from cached `business_subscriptions` row, not a join query).
2. **Reliability:** Stripe webhook processing SHALL be idempotent — processing the same event twice SHALL produce the same result (same pattern as existing order webhooks).
3. **Security:** Business API keys SHALL be stored as bcrypt hashes — the plaintext key is never stored and cannot be recovered.
4. **Backward compatibility:** All existing businesses without a subscription record SHALL default to the Free tier automatically.
5. **Graceful degradation:** If the subscription lookup fails, the system SHALL default to the most restrictive tier (Free) rather than the most permissive.
