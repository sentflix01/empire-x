# Deferred product areas

These areas are intentionally outside the first launch scope. Their existing product and engineering implementations are being removed from the active app so the launch can focus on merchant showrooms, product discovery, orders, and profile-owner partnerships. This document preserves the intended direction; it is not a copy of the source code.

Reconsider each area only after the core merchant-to-order workflow has evidence of repeated use. Rebuild from this product record and Git history when it is prioritized again.

## Mewacho — group money collection

**Purpose:** Let a group collect contributions toward a shared goal, maintain a contribution ledger, communicate in the group, and request withdrawals subject to group approval.

**Deferred capabilities:** Group creation and invitations, member roles, contributions and payment confirmation, activity/messages, target progress, withdrawal approvals, notifications, and export. Preserve shared payment, wallet, notifications, and chat infrastructure where used by launch commerce.

## Tasks and gigs

**Purpose:** Let people post local tasks, receive bids, select a helper, track completion, and settle payment.

**Deferred capabilities:** Task board and creation, bidding, calendar/map views, task notifications, and task-specific payments. Keep general maps, products, business discovery, and order flows.

## Courses

**Purpose:** Let instructors publish courses and lessons and let learners enroll and track progress.

**Deferred capabilities:** Course catalog, course detail/player, enrollment, lesson progress, and course-specific search. Showroom content sections that happen to describe a merchant's services remain available as ordinary merchant content.

## Jobs

**Purpose:** Let employers publish openings and candidates apply and track application status.

**Deferred capabilities:** Job board, job creation, applications, job-specific search, and standalone job listings embedded in showroom sections. General business profiles and merchant contact information remain part of launch.

## Events

**Purpose:** Let organizers publish events and let attendees book or buy tickets.

**Deferred capabilities:** Event listings, event creation, bookings, ticketing, and event-specific search. A merchant may still describe event-related services in a showroom as ordinary product/service content.

## Re-entry checklist

Before restoring a deferred area, define its launch cohort and success metric, confirm that it does not distract from the merchant order workflow, review the historical implementation and data model, and plan a staged migration if stored user data must be made active again. Historical database tables and user records are retained during this scope reduction; this document does not authorize dropping them.
