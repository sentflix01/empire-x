# Nodbusiness — Product Requirement Documents (PRDs)

> A PRD defines what to build and why, before writing any code.
> Engineers, designers, and product managers all work from the same specification.
> Use this template for every new major feature.

---

## PRD Template

```markdown
## PRD: [Feature Name]

**Status:** Draft | Review | Approved | Shipped
**Owner:** [Name]
**Date:** [Month Year]
**Target phase:** Phase 1 / 2 / 3

### Problem
What problem does this feature solve?
Who has this problem? How often? How painful is it?

### Goals
What does success look like?
List 2-3 measurable outcomes.

### Non-Goals
What is explicitly NOT in scope for this version?

### User Stories
As a [role], I want [action], so that [benefit].

### Design
How does it work? Wireframes or flow description.

### Technical Notes
Backend changes needed?
Database changes needed?
New API endpoints?
Feature flag name?

### Success Metrics
How will we know this worked?
What do we measure at 30 days?

### Open Questions
What still needs to be decided?
```

---

## PRD-001: Nearby Marketplace Map

**Status:** Shipped  
**Target phase:** Phase 1

### Problem
Users in Addis Ababa can't easily discover products, businesses, and services that are physically nearby. They have to search by text and have no sense of proximity.

### Goals
- Users can find products and businesses within a configurable radius of their location
- 30% of marketplace sessions include a map interaction within 60 days of launch

### Non-Goals
- Turn-by-turn navigation
- Real-time location tracking of users
- Delivery routing

### User Stories
- As a buyer, I want to see products on a map near me, so I can find local sellers
- As a business owner, I want my products to appear on the nearby map, so local customers find me
- As a user, I want to hover a pin and see a quick preview, so I don't have to click every pin

### Technical Notes
- Products and businesses store `latitude` and `longitude` (already in schema); historical task coordinates do not make tasks a launch feature
- Map: React Leaflet with marker clustering (`leaflet.markercluster`)
- ProfilePeek modal opens on marker click
- Dynamic import needed (Leaflet is client-only, uses `window`)

### Success Metrics
- Nearby tab opens > 20% of daily sessions within 30 days
- Map-originated orders > 10% of total orders within 60 days

---

## PRD-002: Showroom Studio

**Status:** Shipped  
**Target phase:** Phase 1

### Problem
Small businesses in Ethiopia have no affordable, easy way to build a professional online presence. Setting up a website requires technical skills most don't have.

### Goals
- A business owner can build a professional showroom in under 30 minutes
- 500 published showrooms within 90 days of launch

### Non-Goals
- Custom domain per showroom (Phase 3)
- Custom CSS editing
- E-commerce checkout directly from showroom (orders go through marketplace)

### User Stories
- As a business owner, I want to choose from a template and add my products and services, so I have a professional online presence
- As a buyer, I want to browse a business's full catalog in one place, so I can see everything they offer

### Technical Notes
- 27 templates across 9 categories (already built)
- Sections: hero, products, services, gallery, contact, testimonials
- Slug-based URLs: `/showrooms/[id]` or future `/s/my-business`
- Template data in `frontend-next/lib/showroomTemplates.ts`

---

## PRD-003: Real-Time Chat

**Status:** Shipped  
**Target phase:** Phase 1

### Problem
Buyers and sellers need to communicate. Without real-time chat, negotiations happen on WhatsApp (outside the platform), which makes transactions harder to track and secure.

### Goals
- Messages delivered in < 500ms
- Chat is the primary communication channel for marketplace transactions

### Non-Goals
- Voice/video calls (Phase 3)
- End-to-end encryption (Phase 3)
- Message reactions in Phase 1

### Technical Notes
- Socket.IO for real-time delivery
- Messages stored in PostgreSQL for history
- Conversations can be DM, group, or channel type
- Notification emitted on new message if recipient is not in the conversation room

---

## PRD-004: Chapa Payment Integration

**Status:** Planned (Phase 2)
**Target phase:** Phase 2

### Problem
Stripe requires international cards. Most Ethiopian users pay with Telebirr, CBE Birr, or local bank transfers. Without local payment options, conversion is low.

### Goals
- Ethiopian users can pay with Telebirr and local bank cards
- Payment success rate for Ethiopian users increases from ~30% to >80%

### Non-Goals
- Replace Stripe (keep for international buyers; deferred product areas do not define launch payment scope)

### Technical Notes
- Chapa API: https://developer.chapa.co
- Route already scaffolded in `backend/routes/orders.js` (`POST /api/orders/checkout/chapa`)
- Feature flag: `chapa_payments`
- New env vars: `CHAPA_SECRET_KEY`

---

## PRD-006: Mewacho — Group Money Collection (Deferred)

**Status:** Deferred; historical product proposal only. Not in the active launch app.
**Target phase:** Unscheduled; requires a new product decision and staged re-entry review.

### Problem
Ethiopians regularly collect money together for birthdays, weddings, trips, and charity — but manage it over WhatsApp with no transparency, no payment integration, and no audit trail. Money gets lost, contributions are disputed, and there's no easy way to see the running total.

### Goals (proposed, not active commitments)
- If reprioritized, group admins could collect contributions through an approved payment flow
- Members could review contribution activity and balances
- Admins could request withdrawals with a clear approval workflow

### Proposed non-goals (if reprioritized)
- Payment methods and currencies must be decided during a future product review.
- Recurring reminders and Equb-style rotation are not currently scheduled.

### Proposed user stories (not active commitments)
- As a group creator, I want to set a target amount and invite members via link or QR, so people can join easily
- As a member, I want to contribute money via Stripe and see my contribution appear instantly in the feed
- As any member, I want to see the running total and who has paid, so there's full transparency
- As an admin, I want to request a withdrawal with a destination account, so collected money reaches its purpose
- As any member, I want to download a PDF summary of all contributions and withdrawals

### Technical Notes
- Historical migration/data may remain in the database but is not an active route or API contract.
- Do not drop or reactivate historical tables as part of launch cleanup.
- Before re-entry, audit retained data, payment/webhook ownership, authorization, reconciliation, and migration needs; see [Deferred product areas](POST_LAUNCH_FEATURES.md).

### Success Metrics
- Define a measurable pilot goal and safety/reconciliation criteria before approving a future phase.

---

## PRD-005: Business Analytics Dashboard (Planned)

**Status:** Draft  
**Target phase:** Phase 2

### Problem
Business owners have no visibility into how their showroom and products are performing. They can't make data-driven decisions.

### Goals
- Sellers can see their revenue, order volume, and product views in one dashboard
- Dashboard data is < 1 hour delayed

### Non-Goals
- Cohort analysis
- Funnel visualization (Phase 3)
- Export to CSV in Phase 1

### User Stories
- As a seller, I want to see my monthly revenue and order count, so I can track my business growth
- As a seller, I want to see which products get the most views, so I know what to promote

### Technical Notes
- New page: `/analytics`
- Queries: aggregate from `orders`, `products` (view_count), `showrooms` (view_count)
- Charts: Recharts (already installed)
- Consider caching aggregate queries in Redis (invalidate on new order)
