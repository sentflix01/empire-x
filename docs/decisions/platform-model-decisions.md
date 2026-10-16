# Platform model: money, billing, guest access and Demo

**Decided:** 2026-10-15 and 2026-10-16 by the product owner (@Sent).
**Status:** Accepted. Implementation pending; each section lists what changes in the code.
**Supersedes:** the 3% platform commission, the user wallet holding real money, the `$12 / $49` plan table shipped in PR #104, the Day-3 owner lockout, and the 2026-10-15 decision "Demo storefronts showcase supported flows without simulating external integrations" (see §8).

---

## 1. What NodBusiness is

NodBusiness is a storefront and connection platform between business owners and customers. **It never holds customer funds.** Its only revenue is business-owner subscriptions; it takes nothing from customer purchases.

| Consequence | Code change |
|---|---|
| No platform commission on orders | Remove the 3% commission charged at payment and at completion (`commissions` writes in `routes/orders.ts`, `routes/commission.ts`). Keep historical rows for accounting. |
| No money in NodBusiness accounts | Internal payments use provider flows that settle to the **seller's own account** (e.g. Stripe Connect connected accounts, Chapa sub-accounts). Checkout must never charge into a platform-owned account. |
| No user wallet holding money | Remove top-up, withdrawal and commission debits. Before switching off, pay out or zero any real balances in production. A non-cash points ledger (referral points) may remain. |
| Creator partnerships | `profile_owner_commissions` and payouts are **recorded and reported only**; the business owner and the profile owner settle directly. NodBusiness does not transfer these amounts. |

## 2. Customer purchase flow

- Anyone can open a business's public site from its QR code or link and view products and services **without signing in**, unless the owner made the business **private** (§7.5). A private business asks the visitor to sign in first.
- Choosing **Buy** or **Request service** opens a checkout/contact view with the seller's business details, address details and payment instructions.
- The seller offers one or both payment options, and controls which options and account details are shown:
  1. **Pay the seller directly**: the seller's own payment account details are shown; the customer pays outside NodBusiness (bank transfer, mobile money).
  2. **Pay through an integrated provider**: a supported provider or gateway processes the payment and settles to the seller. NodBusiness never holds the funds.

### 2.1 Guest checkout

- A guest gives a name, **phone and email**.
- The guest receives a private order link: a long random token, not guessable, to view status, report payment, upload a receipt and message the seller.
- **Notifications:** email first (Resend, already configured). SMS is added later once an SMS provider is chosen.
- Abuse limits on guest orders: rate limits per IP, phone and email; CAPTCHA if abuse appears.
- A guest who later creates an account can claim past orders by verified phone or email.

### 2.2 Confirming external payments

Order states for "pay the seller directly":

`awaiting_payment` → (buyer: "I've paid", optional receipt) → `payment_reported` → (seller confirms) → `paid` → existing fulfilment states.

- Receipt upload is **optional**.
- Receipts are stored privately and visible only to the buyer (through the order link or account) and the seller.
- An order with no buyer report or seller confirmation **expires after 7 days** (`expired`).
- Only the seller can mark an order `paid`. The buyer's report alone never does.

### 2.3 Address privacy

- By default only **business contact details** are public. A personal address or phone number is never shown by default.
- Owners choose which business contact fields are public (per-field visibility on the Business profile), enforced by the server in public API responses, not only hidden in the UI.
- A **pickup address** is a separate field shown to the buyer only after an order is placed.

## 3. Subscription plans

Billing currency is **ETB**. These prices are final and replace every other price table, including the `$12 / $49` table in the Terms of Service and MONETIZATION docs shipped in PR #104.

| Plan | Price |
|---|---|
| Normal | ETB 100 / month |
| Premium | ETB 500 / month |
| Pro | ETB 1,000 / month |
| Enterprise | Custom terms |

USD equivalents ($1 / $5 / $10) remain in `backend/lib/subscriptionPlans.ts` **only for billing businesses outside Ethiopia**. They are not shown to Ethiopian businesses. Whether foreign billing is offered at all is a separate future decision.

## 4. Business and site structure

- Each subscription belongs to one **Business profile**; an owner with several businesses pays for each separately.
- Each published Showroom site is linked to one Business profile in the database; the server enforces the link.
- Every public route checks the subscription of the linked Business.
- Owner flow: create the Business profile → build the site in Showroom Studio and link it → choose a plan when publishing → renew to stay public.

## 5. Drafts

- Owners can build and save a draft without subscribing; publishing requires an active subscription.
- A draft not subscribed and published within **3 days** is deleted. Expiry is enforced on the server; an expired draft cannot be revived from an old link.

## 6. After a subscription expires

Days are counted from the moment the subscription expires.

| Time after expiry | What happens |
|---|---|
| Expiry | Owner notified; can pay to continue. |
| First 24 hours | Site stays public (grace period). |
| After 24 hours | Hidden from everyone except the owner: direct URL, feeds, search, trending, showroom and product listings, public profile details. |
| Day 3 | Warning: blocked and deleted unless the owner pays. |
| Day 7 | Second warning. |
| Day 9 | Final warning. |
| Day 10 | Site and Business profile permanently deleted; owner emailed; owner cannot create a new Business profile for 1 month (the account itself remains usable). |

- **Owner access until Day 10 (decided 2026-10-16):** the owner keeps full access to the hidden business (view, edit and renew) until deletion. This replaces the implemented Day-3 owner lockout (`blockedForOwner` at 3 days in `backend/lib/businessSubscriptionPolicy.ts`).
- Transaction records needed for order history and accounting are kept after deletion.
- Reminder emails are recorded per billing period so scheduled checks never send duplicates.

## 7. Visibility and access

### 7.1 Guests browse Real content, read-only (decided 2026-10-16)

- A visitor without an account can browse **Real** public businesses, products, services and published showrooms **read-only**. Any write (follow, like, comment, message, post) requires signing in; buying works through guest checkout (§2.1).
- **Guests see the business feed only** (updated 2026-10-16, §7.5). Personal posts, stories, people and personal profiles need sign-in; signed-in users see both the personal and the business feed.
- **Guests never connect to Demo accounts or Demo data.** Demo is entered only through **Try Demo**.
- This replaces the earlier rule "Explore as guest is read-only and shows Demo content only".

### 7.2 Real business QR and link page

- Scanning a business's QR code or opening its link shows **only that business's public page**, where the visitor can view and buy. It never exposes the owner's account or private data.
- The page has two buttons: **Back to Landing** and **Try Demo**.

### 7.3 Search engines

Real published **public** businesses stay **findable by search engines** (sitemap and public pages kept). Only a business's public page is exposed. **Private** businesses are left out of the sitemap and their pages are marked `noindex` (§7.5).

### 7.4 Demo / Real separation

- Simulated users, seed data, demo businesses and practice showrooms exist **only in Demo**.
- Real accounts and guests see only Real users and businesses.
- Separation applies to API reads and writes, profiles, feeds, search, showroom pages and cache keys. A separation audit covers every one of these paths.
- **Demo payments never connect to real payment providers.**

### 7.5 Public or private business sites (decided 2026-10-16)

- The owner chooses who can view the business, its sites and its products: **Public** (default) or **Private**. The choice is made in the business settings and in the site builder when publishing, and applies to the whole business.
- **Public:** anyone can open it from a QR code or link, browse and buy as a guest; it appears in guest feeds, search and search engines.
- **Private:** only signed-in users can view it and buy. Guests opening its link or QR code see "Sign in to view" and return to the page after signing in. It is hidden from guests in feeds, search, maps and trending, has no link preview, is not in the sitemap, and is marked `noindex`.
- The server enforces this (`businesses.visibility`, `lib/siteVisibility.ts`); a guest request for a private business gets `401 SIGN_IN_REQUIRED`.
- This narrows §2 (open without signing in) and §7.3 (findable by search engines) to public businesses.

## 8. Demo content

**Supersedes** the 2026-10-15 decision "Demo storefronts showcase supported flows without simulating external integrations". Demo businesses now **simulate** their core flows, clearly labelled as Demo simulations.

- Every demo user has a personal profile and a business profile, profile and cover images, and realistic posts on both feeds.
- Every demo business includes what its business type needs, with **at least 5–10 working products or services**.
- **Every template and demo site is built through the real builder pathway** (Build section or Showroom template → customize → publish), so it shows users how to build their own.
- Business types and their presentation patterns, to be confirmed by a research step before building:

| Type | Pattern |
|---|---|
| Ride service | Request flow: pickup and destination on a map, ride options and prices, simulated drivers. The route line is **simulated** (no routing service); full-screen map preview. |
| Telecom | Packages, bundles, top-up amounts (simulated, no real top-up). |
| Booking (hotels, clinics, salons, events) | Date and time slot selection. |
| Supermarket, pharmacy | Large catalogue: search within the business, categories, filters, clear listings; the business's stock also appears in platform-wide search. |
| Government institution | Service pages like an official site, built around its main services, clearly marked as a Demo (not official). |

- **Research first:** before building, analyse the best presentation for each business type (catalogue, booking, service request, package selection, etc.) and apply the most suitable design to each demo business.

## 9. Delivery order

1. Money model: commission and wallet removal, seller payment accounts, Buy view, guest checkout with order link, external-payment confirmation, address visibility.
2. Subscription alignment: ETB plans across docs and UI, owner access until Day 10.
3. Access: guest read-only Real browsing, QR single-business page with Back to Landing and Try Demo, Demo/Real separation audit.
4. Demo content: presentation research, then shared section types, then seeded businesses built through the builder pathway.
