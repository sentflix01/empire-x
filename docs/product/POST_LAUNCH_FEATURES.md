# Deferred product areas

These areas are intentionally outside the first launch scope. Their routes and entry points are not part of the active product. Historical database tables and migrations are retained so existing records and shared infrastructure are not destroyed. The launch focuses on merchant showrooms, product discovery, orders, and profile-owner partnerships. This document preserves product direction; it is not a copy of the source code.

Reconsider each area only after the core merchant-to-order workflow has evidence of repeated use. Rebuild from this product record and Git history when it is prioritized again.

## Mewacho — group money collection

**Purpose:** Let a group collect contributions toward a shared goal, maintain a contribution ledger, communicate in the group, and request withdrawals subject to group approval.

**Deferred capabilities:** Group creation and invitations, member roles, contributions and payment confirmation, activity/messages, target progress, withdrawal approvals, notifications, and export. Preserve shared payment, wallet, notifications, and chat infrastructure where used by launch commerce.

**Shared dependencies to preserve:** Payment processing, wallet primitives, notifications, chat, and audit logging where they serve launch commerce. Do not expose Mewacho tables or endpoints as a substitute for those shared services.

## Tasks and gigs

**Purpose:** Let people post local tasks, receive bids, select a helper, track completion, and settle payment.

**Deferred capabilities:** Task board and creation, bidding, calendar/map views, task notifications, and task-specific payments. Keep general maps, products, business discovery, and order flows.

**Shared dependencies to preserve:** General-purpose maps and notifications used by active discovery and commerce. Historical task records remain inactive; do not return them from launch APIs.

## Courses

**Purpose:** Let instructors publish courses and lessons and let learners enroll and track progress.

**Deferred capabilities:** Course catalog, course detail/player, enrollment, lesson progress, and course-specific search. Showroom content sections that happen to describe a merchant's services remain available as ordinary merchant content.

**Shared dependencies to preserve:** Merchant service/product content and general search infrastructure. A service description in a showroom is not a course enrollment or course record.

## Jobs

**Purpose:** Let employers publish openings and candidates apply and track application status.

**Deferred capabilities:** Job board, job creation, applications, job-specific search, and standalone job listings embedded in showroom sections. General business profiles and merchant contact information remain part of launch.

**Shared dependencies to preserve:** Business profiles, contact details, and general user profiles. These do not reactivate job listings or applications.

## Events

**Purpose:** Let organizers publish events and let attendees book or buy tickets.

**Deferred capabilities:** Event listings, event creation, bookings, ticketing, and event-specific search. A merchant may still describe event-related services in a showroom as ordinary product/service content.

**Shared dependencies to preserve:** General merchant service listings, orders, and payment infrastructure. An event-related service sold by a merchant remains an ordinary offering, not an event booking.

## Re-entry checklist

Before restoring an area:

1. Define the target cohort, user problem, owner, success metric, and launch decision.
2. Validate demand against the merchant showroom and order workflow, and stage the rollout behind an explicit feature flag.
3. Audit historical routes, APIs, permissions, migrations, data quality, seed data, and shared dependencies.
4. Specify how retained records are revalidated and migrated before becoming visible or writable; do not assume old records are safe to reactivate unchanged.
5. Add authorization, isolation, moderation, privacy, payment/refund, and abuse controls appropriate to the area.
6. Add route/API tests and end-to-end checks for the new rollout, and update the route inventory and this document.

Historical database tables and user records are retained during this scope reduction; this document does not authorize dropping them or changing production data. Current launch references to these features in the PRD, research, navigation, API, and route inventory must be marked historical or deferred.
