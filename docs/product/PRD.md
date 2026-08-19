# Nodbusiness — Product Requirement Documents (PRDs)

> A PRD defines what to build and why, before writing any code.
> Engineers, designers, and product managers all work from the same specification.
> Use this template for every new major feature.
> Last updated: August 2026

---

## Acronyms Used in This Document

| Acronym | Full Form |
|---------|-----------|
| PRD | Product Requirements Document |
| API | Application Programming Interface |
| UI | User Interface |
| UX | User Experience |
| KPI | Key Performance Indicator |
| MAU | Monthly Active Users |
| GMV | Gross Merchandise Value |
| ETB | Ethiopian Birr — reference market currency |
| USD | United States Dollar |
| MVP | Minimum Viable Product |
| A/B | A/B Testing — comparing two variants |

------

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
Users can't easily discover products, businesses, and services that are physically nearby. They have to search by text and have no sense of proximity.

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
- Products/businesses/tasks store `latitude` and `longitude` (already in schema)
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
Small businesses worldwide have no affordable, easy way to build a professional online presence. Setting up a website requires technical skills most don't have.

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

## PRD-004: Chapa Payment Integration (Planned)

**Status:** Approved  
**Target phase:** Phase 2

### Problem
Stripe requires international cards in some regions. Many users pay with local mobile money or bank transfers. Without local payment options, conversion is low.

### Goals
- Users can pay with local payment methods (Telebirr, CBE Birr, mobile money)
- Payment success rate for local users increases significantly

### Non-Goals
- Replace Stripe (keep for international buyers)

### User Stories
- As a local buyer, I want to pay with my mobile wallet, so I don't need an international card
- As a seller, I want to receive payments in local currency directly to my bank account

### Technical Notes
- Chapa API: https://developer.chapa.co
- Add `POST /api/orders/checkout/chapa` route
- Add `POST /api/orders/chapa-webhook` for payment verification
- Feature flag: `chapa_payments`
- New env vars: `CHAPA_SECRET_KEY`

### Success Metrics
- Chapa payment volume > 50% of total GMV within 60 days of launch

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
