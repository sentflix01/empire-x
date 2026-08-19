# Integration Marketplace — Tasks

## Status: 🔴 Not Started

---

## What This Is

A public directory of apps, tools, and integrations built on Nodbusiness.
Discoverable by any business owner who wants to connect their tools.

Think: Shopify App Store, Zapier integrations, Slack App Directory.

---

## Step 1 — Integration Types

### Category A: Data Sync Integrations
Connect existing business tools to Nodbusiness:

| Integration | What It Does |
|---|---|
| Shopify Sync | Import Shopify products → Nodbusiness listings, sync orders back |
| WooCommerce Bridge | Same for WordPress/WooCommerce stores |
| Google Sheets Export | Export orders/products/customers to Google Sheets |
| QuickBooks Connector | Sync Nodbusiness orders to accounting |
| Inventory CSV Import | Bulk import products from a spreadsheet |

### Category B: Communication Integrations
Connect messaging platforms:

| Integration | What It Does |
|---|---|
| WhatsApp Business | Send order updates via WhatsApp Business API |
| Telegram Bot | Manage orders and messages from Telegram |
| SMS Gateway | Send OTPs and notifications via SMS (Africastalking) |
| Email Marketing | Sync customers to Mailchimp / Brevo |
| Slack Alerts | Receive new order notifications in Slack |

### Category C: Payment Integrations
Additional payment methods:

| Integration | What It Does |
|---|---|
| Telebirr Direct | Native Telebirr payment (when official API available) |
| M-Pesa | Kenya, Tanzania, Uganda mobile money |
| Paystack | Nigeria, Ghana card payments |
| Flutterwave | Pan-African payment gateway |
| MTN Mobile Money | Uganda, Côte d'Ivoire |

### Category D: Automation (Zapier/Make)
No-code automation connectors:

| Integration | What It Does |
|---|---|
| Zapier | Connect Nodbusiness to 5,000+ apps without code |
| Make (Integromat) | Visual workflow automation with Nodbusiness |
| n8n | Self-hosted automation with Nodbusiness nodes |

### Category E: Analytics & Intelligence
Business intelligence tools:

| Integration | What It Does |
|---|---|
| Google Analytics | Track showroom + marketplace page views |
| Meta Pixel | Retarget Nodbusiness visitors on Facebook/Instagram |
| Hotjar | Heatmaps and session recordings on public showrooms |
| Tableau / Power BI | Export Nodbusiness data to BI dashboards |

---

## Step 2 — Database Migration

- [ ] Create `backend/db/migrate33.js` — `integrations` table:
  ```sql
  CREATE TABLE IF NOT EXISTS integrations (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    developer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    name         TEXT NOT NULL,
    slug         TEXT NOT NULL UNIQUE,
    tagline      TEXT NOT NULL,
    description  TEXT,
    category     TEXT NOT NULL CHECK (category IN
                   ('data_sync','communication','payment','automation','analytics','other')),
    logo_url     TEXT,
    screenshots  TEXT[],            -- JSON array of screenshot URLs
    install_url  TEXT,              -- external URL or internal setup page
    docs_url     TEXT,
    pricing      TEXT DEFAULT 'free', -- 'free' | 'paid' | 'freemium'
    price_label  TEXT,              -- "Free" | "$9/mo" | "From $29/mo"
    is_verified  BOOLEAN DEFAULT FALSE, -- Nodbusiness-vetted
    is_featured  BOOLEAN DEFAULT FALSE,
    install_count INTEGER DEFAULT 0,
    rating       NUMERIC(3,2) DEFAULT 0,
    status       TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
    created_at   TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS user_integrations (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
    config         JSONB DEFAULT '{}',  -- encrypted connection settings
    is_active      BOOLEAN DEFAULT TRUE,
    installed_at   TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, integration_id)
  );
  ```

---

## Step 3 — Integration Routes

- [ ] Add to `backend/routes/developer.js`:
  ```
  GET  /api/integrations              — public: list all approved integrations
  GET  /api/integrations/:slug        — public: single integration detail
  POST /api/integrations              — submit new integration (developer)
  PUT  /api/integrations/:slug        — update own integration (developer)

  GET  /api/integrations/installed    — user's installed integrations (auth)
  POST /api/integrations/:slug/install — install integration (auth)
  DELETE /api/integrations/:slug/install — uninstall (auth)
  ```

---

## Step 4 — Marketplace Page (Frontend)

- [ ] Create `frontend-next/app/(app)/integrations/page.tsx`
  - Header: "Connect Your Tools"
  - Category tabs: All / Data Sync / Communication / Payments / Automation / Analytics
  - Search bar
  - Integration cards: logo + name + tagline + "Install" or "Installed ✓" button
  - Featured integrations row at top
  - "Submit your integration" CTA at bottom

- [ ] Integration detail page `/integrations/[slug]`:
  - Logo, name, developer, install count, rating
  - Screenshots carousel
  - Full description with features list
  - Pricing badge
  - "Install" button → setup flow or external link
  - "Verified by Nodbusiness" badge if verified
  - Reviews/ratings section

---

## Step 5 — Zapier Integration (Priority #1)

Zapier has 5 million+ businesses. A Nodbusiness Zapier integration means
Zapier's entire user base can discover and connect to Nodbusiness.

- [ ] Register Nodbusiness as a Zapier app at zapier.com/developer
- [ ] Build Zapier triggers:
  - "New Order" — fires when order is created
  - "New Product" — fires when product is listed
  - "New Message" — fires when user receives a DM
  - "New Task Bid" — fires when task gets a bid
- [ ] Build Zapier actions:
  - "Create Product" — creates a new product listing
  - "Update Order Status" — changes order to processing/shipped/etc.
  - "Send Message" — sends a DM to a user
  - "Create Post" — publishes a post to the feed
- [ ] Publish Zapier app (public, free)

---

## Step 6 — Revenue Sharing Program

- [ ] Document revenue sharing in `docs/strategy/PLATFORM_VISION.md`
- [ ] Track which orders were influenced by which integration (UTM-style attribution)
- [ ] Monthly payout: developer earns 0.5% of GMV driven by their integration
- [ ] Minimum payout: $10/month (anything below rolls over)
- [ ] Payment via: Stripe, Nodbusiness wallet, or bank transfer

---

## Step 7 — Verify

- [ ] Browse integration marketplace, install a test integration
- [ ] Zapier trigger fires when an order is placed
- [ ] Zapier action creates a product via Nodbusiness API
- [ ] Uninstall removes the user_integration record
- [ ] Submit an integration → goes to pending → admin approves → appears in marketplace
