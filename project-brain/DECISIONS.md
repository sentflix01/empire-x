# Project Decisions and Open Questions

This is the concise, cross-cutting decision log for decisions that affect how
work is carried out. Feature-specific technical rationale may remain in
`docs/architecture/ADR.md` or the relevant product specification.

## Confirmed working agreements

These are captured from the repository's current contributor documentation.
They remain subject to an explicit maintainer decision if that documentation
is amended.

| Decision | Source / rationale |
|---|---|
| Work in the existing monorepo, with frontend and backend concerns kept in their respective packages. | Repository structure and `CONTRIBUTING.md`; avoids mixing UI and server responsibilities. |
| Use focused branches with the documented `feat/`, `fix/`, `chore/`, `refactor/`, or `docs/` prefixes. | `CONTRIBUTING.md`; makes change intent visible. |
| Use Conventional Commit messages. | `CONTRIBUTING.md`; keeps change history consistent. |
| Parameterize SQL and apply backend validation, authentication, and resource-ownership checks to protected API behavior. | `CONTRIBUTING.md` and `docs/ENGINEERING_STANDARDS.md`; protects data and prevents injection/unauthorized access. |
| Register and document new feature flags in the existing backend flag system. | `CONTRIBUTING.md` and `docs/product/FEATURE_FLAGS.md`; keeps rollout behavior reviewable. |
| Update maintained documentation when a change affects documented behavior. | `CONTRIBUTING.md`; prevents API, product, and operational guidance from drifting. |
| Keep secrets and local environment files out of Git; use example templates for setup guidance. | `CONTRIBUTING.md`, `.gitignore`, and `SECURITY.md`; protects credentials. |
| Prefer focused tests and package-specific checks; run the broader contributor gates before a pull request. | `CONTRIBUTING.md` and package scripts; balances fast feedback with release confidence. |

## Conflicts requiring verification

These are observations, not decisions. Resolve them in the owning source
documents when verified; do not copy stale values into new work.

| Topic | Conflicting evidence | Required action |
|---|---|---|
| Backend Express version | Root `README.md` describes Express 4; `backend/package.json` currently declares Express 5. | Treat the package manifest as the installed dependency declaration; update the overview after maintainers verify compatibility and deployment state. |
| Frontend hosting | `frontend-next/README.md` mentions Cloudflare Pages, while root project docs describe Vercel. | Verify the active deployment target and update deployment docs before changing deployment configuration. |
| Local developer setup | `docs/ONBOARDING.md` and root `README.md` have differing and partially duplicated setup instructions. | Confirm the supported local database/env path, then consolidate the docs without changing credentials or live resources. |

## Open decisions

- Confirm and document one canonical local setup path (database, env templates,
  package installation, migration workflow, and startup commands).
- Confirm the active frontend hosting target and make all deployment guidance
  consistent with the live project.
- Decide whether the engineering handbook's broad statements (for example,
  mandatory feature flags or endpoint versioning) are universal requirements
  or recommendations, then align them with actual practice.

## Accepted feature decisions

### 2026-10-16 — NodBusiness never holds customer funds; revenue is subscriptions only

- **Status:** Accepted
- **Decision owner:** Project owner (@Sent)
- **Context:** The platform charged a 3% commission and kept a user wallet,
  both of which require holding customer money.
- **Decision:** Remove the platform commission and the money-holding wallet.
  Sellers are paid directly, by external payment or by an integrated provider
  that settles to the seller's own account. Creator partnership commissions
  are recorded and reported only; the parties settle directly.
- **Consequences:** Checkout must never charge into a platform-owned account.
  Real wallet balances must be paid out or zeroed before the wallet is switched off.
- **Related documentation:** [Platform model decisions](../docs/decisions/platform-model-decisions.md) §1

### 2026-10-16 — Guest checkout, external-payment confirmation and address privacy

- **Status:** Accepted
- **Decision owner:** Project owner (@Sent)
- **Decision:** Guests buy without an account using phone and email and a
  private order link; notifications go by email first and SMS later. For
  external payments the buyer reports payment (receipt optional, stored
  privately) and only the seller confirms; unconfirmed orders expire after 7
  days. Only business contact details are public by default, per-field
  visibility is owner-controlled and server-enforced, and the pickup address
  shows only after an order.
- **Related documentation:** [Platform model decisions](../docs/decisions/platform-model-decisions.md) §2

### 2026-10-16 — ETB subscription plans and owner access until deletion

- **Status:** Accepted
- **Decision owner:** Project owner (@Sent)
- **Decision:** Plans are Normal ETB 100, Premium ETB 500, Pro ETB 1,000 and
  Enterprise custom per month, replacing the `$12 / $49` table shipped in PR
  #104. USD equivalents are kept only for billing businesses outside Ethiopia.
  After expiry the owner keeps full access (view, edit, renew) to the hidden
  business until the Day-10 deletion, replacing the implemented Day-3 owner
  lockout.
- **Related documentation:** [Platform model decisions](../docs/decisions/platform-model-decisions.md) §3, §6

### 2026-10-16 — Guests browse Real content read-only; Demo only through Try Demo

- **Status:** Accepted
- **Decision owner:** Project owner (@Sent)
- **Decision:** Visitors without an account browse Real businesses, products,
  services and feeds read-only and never connect to Demo data. A business QR
  code or link opens only that business's public page, with Back to Landing
  and Try Demo buttons. Real published businesses stay findable by search
  engines. Demo/Real separation is audited across reads, writes, profiles,
  feeds, search, showroom pages and cache keys; Demo payments never reach real
  providers. This replaces "Explore as guest shows Demo content only".
- **Related documentation:** [Platform model decisions](../docs/decisions/platform-model-decisions.md) §7

### 2026-10-16 — Demo businesses simulate their core flows, built through the builder

- **Status:** Accepted. **Supersedes** the 2026-10-15 decision below.
- **Decision owner:** Project owner (@Sent)
- **Decision:** Demo businesses (ride service, telecom, booking, supermarket,
  pharmacy, government) simulate their core flows, clearly labelled as Demo,
  with 5–10 or more working products or services each. Every template and demo
  site is built through the real Build/template → customize → publish
  pathway. A research step decides the best presentation for each business
  type before building. The ride-service route line is simulated.
- **Related documentation:** [Platform model decisions](../docs/decisions/platform-model-decisions.md) §8

### 2026-10-15 — Demo storefronts showcase supported flows without simulating external integrations

- **Status:** Superseded on 2026-10-16 by "Demo businesses simulate their core flows, built through the builder" above.
- **Decision owner:** Project owner
- **Context:** The Demo should demonstrate different business models, while the
  current platform does not provide live ride dispatch, telecom provisioning,
  government transactions, or confirmed third-party appointment reservations.
- **Decision:** Seed clearly fictional business-specific storefronts with
  5–10 relevant catalog or service listings. Use the existing order flow for
  listed products and the authenticated inquiry flow for service and booking
  requests. Label requests as inquiries, not confirmations, and disclose where
  a showcase is not an official or integrated service.
- **Rationale:** The examples should be interactive without misleading buyers
  about fulfillment or pretending an external provider is connected.
- **Consequences:** Demo can exercise product discovery, checkout, and
  business-owner inquiry workflows. Live dispatch, provider activation, official
  government submissions, and guaranteed reservations remain out of scope
  until their real backend integrations exist. Keep both personal and business
  identity fields in the existing single profile row; do not create duplicate
  profile rows for the Demo owner.
- **Related documentation:** [Demo workspace deployment](../docs/operations/DEMO_WORKSPACE_DEPLOYMENT.md)

### 2026-10-16 — Owners choose public or private; guests see the business feed only

- **Status:** Accepted
- **Decision owner:** Project owner (@Sent)
- **Context:** Every business site was open to anyone, and guests could read
  personal posts and profiles.
- **Decision:** Each business is **Public** (default) or **Private**. Private
  businesses, their sites and products are for signed-in users only and are
  hidden from guests, the sitemap and search engines. Guests see the business
  feed only; personal posts, stories, people and personal profiles need
  sign-in. This narrows "open without signing in" and "findable by search
  engines" to public businesses.
- **Consequences:** Guest-facing reads go through `lib/siteVisibility.ts`;
  a guest request for private or personal content gets `401 SIGN_IN_REQUIRED`
  and the page shows "Sign in to view". Response caches split guests from
  members.
- **Related documentation:** [Platform model decisions](../docs/decisions/platform-model-decisions.md) §2, §7.1, §7.3, §7.5

### 2026-10-16 — Legacy websites get a Business profile and a 30-day free period

- **Status:** Accepted
- **Decision owner:** Project owner (@Sent)
- **Context:** All 12 public production sites were published before every site
  had to belong to a Business profile (`business_id` is null), so the new
  visibility rules would hide them.
- **Decision:** `migrate59` creates one Business profile per real owner from
  their latest site's title and category, links their published sites, grants
  30 days free at the plan tier their sections need, and notifies them in the
  app; the lifecycle job emails each owner once. After the free period the
  normal expiry timeline applies.
- **Consequences:** The free period must not end before owners can pay in ETB
  (Phase 1). If Phase 1 slips, extend the grant before it ends.
- **Related documentation:** [Database](../docs/backend/DATABASE.md), [Platform model decisions](../docs/decisions/platform-model-decisions.md) §4, §6

### 2026-10-16 — globals.css is the only Tailwind configuration; CI fails on missing utilities

- **Status:** Accepted
- **Decision owner:** Project owner (@Sent)
- **Context:** The Next.js 16 move (2026-07-07) upgraded to Tailwind v4 but kept
  the v3 `tailwind.config.js`, which v4 never loads. Theme colours, enter/exit
  animations and the custom radius were silently missing in production for
  three months (151 utilities).
- **Decision:** `frontend-next/app/globals.css` is the single source of theme
  tokens (`@theme`) and Tailwind plugins (`@plugin`). There is no
  `tailwind.config.js`. `npm run check:css` runs after every CI build and fails
  when the source uses a theme or plugin utility the build did not generate.
- **Consequences:** New tokens, including ones a shadcn component needs, are
  added to `@theme` in the same change. The checker's allowlist is only for
  strings that are not classes.
- **Related documentation:** [Engineering Standards](../docs/ENGINEERING_STANDARDS.md#theme-tokens-and-tailwind-v4) (PR #106)

### 2026-10-16 — The Nodbusiness emblem is the only brand mark; onboarding is personal-only

- **Status:** Accepted
- **Decision owner:** Project owner (@Sent)
- **Context:** A crown (the 👑 emoji and lucide's `Crown` icon) stood in for
  the brand in the tab title, onboarding, the 404 page, site footers, invoices
  and the Showroom Studio and Showrooms icons. Onboarding also offered a
  Business Profile path that wrote business fields to the user profile without
  creating a business or a website.
- **Decision:** Use the real emblem (`frontend-next/components/brand/BrandLogo.tsx`,
  `/brand/nodbusiness-icon.svg`) everywhere a crown was. A test fails if a
  crown emoji or a lucide `Crown` import returns. Onboarding has a single
  Personal Information step. Businesses and their websites are created later
  from Businesses or Showroom Studio.
- **Consequences:** Invoices draw the emblem as an image. Onboarding never
  changes an existing profile's business flag.
- **Related documentation:** `frontend-next/test/brand/noCrownBranding.test.ts`, `frontend-next/test/onboarding.test.tsx`

### 2026-10-16 — A published website is maintained from the business profile editor

- **Status:** Accepted
- **Decision owner:** Project owner (@Sent)
- **Context:** The business profile editor had a category grid and a link into
  Showroom Studio, so every content change to a live site meant reopening the
  full builder.
- **Decision:** The editor's "Your website" section loads the owner's
  published site and edits every section it has, saving straight to that site
  (`PUT /api/showrooms/:id`, which re-checks plan entitlements). Adding,
  removing or reordering sections and changing the template stay in Studio.
  Studio and the panel share `lib/showroomSectionsCodec.ts`.
- **Consequences:** Editing the hero's name or tagline also updates the site's
  title or description. The slug never changes, so shared links and QR codes
  keep working. Owners without a published site are sent to Studio.
- **Related documentation:** `frontend-next/components/profile/WebsiteSectionsPanel.tsx`, `frontend-next/test/profile/WebsiteSectionsPanel.test.tsx`

### 2026-10-17 — Legacy websites stay free for six months while the platform is in its trial

- **Status:** Accepted (amends decision 1 of the NodBusiness Build Plan, 2026-10-16)
- **Decision owner:** Project owner (@Sent)
- **Context:** Decision 1 gave the 12 websites published before paid publishing
  a Business profile with a 30-day free period, ending about 2026-11-15. The
  platform is still in a trial with tester-owned sites, much remains to fix
  before beta registration, and ETB checkout (Phase 1, Chapa) is not live, so
  those owners could not pay when the period ended.
- **Decision:** The free period is six months from when each profile was
  created (about 2027-04-16 for the existing 12). `migrate62.js` extends
  existing trialing grants; `migrate59.js` now grants six months to any legacy
  site it still finds.
- **Consequences:** No legacy site enters the expiry timeline before April
  2027. Phase 1 is no longer driven by the November date. Paid (active)
  subscriptions are untouched.
- **Related documentation:** [Database](../docs/backend/DATABASE.md) (migrate62)

### 2026-10-17 — ETB plans are prepaid through Chapa

- **Status:** Accepted
- **Decision owner:** Project owner (@Sent)
- **Context:** Decision 3 of the Build Plan chose Chapa for ETB
  subscriptions. Chapa has no recurring billing; each payment is a one-time
  checkout.
- **Decision:**
  - Owners prepay 1, 3, 6 or 12 months and are reminded before the period
    ends (no automatic charging).
  - Upgrading mid-period pays the price difference for the days left (30-day
    month, rounded up to whole birr) and keeps the end date; months can be
    added at the new price.
  - Downgrades take effect when the paid period ends.
  - A payment counts only after the backend re-verifies it with Chapa;
    webhooks, callbacks and return pages only trigger that check.
  - Stripe stays for USD.
- **Consequences:** `subscription_payments` holds every checkout and receipt.
  Renewal reminders and the scheduler checks follow in Phase 1's later PRs.
- **Related documentation:** [Subscriptions](../docs/backend/SUBSCRIPTIONS.md#prepaid-etb-through-chapa-phase-1)

### 2026-10-17 — Website cards sell through products or requests

- **Status:** Accepted
- **Decision owner:** Project owner (@Sent)
- **Context:** Buy Now on cards typed into website sections (services,
  packages, best sellers, pricing plans) opened a dead-end popup, because
  those cards are not catalogue products and orders need a product.
- **Decision:** Both paths:
  - **Linked:** in Showroom Studio a card can be linked to one of the owner's
    catalogue products ("Sell as product"); Buy Now then sells that product at
    its current price and stock.
  - **Not linked but priced:** Buy Now becomes Request to order. The seller
    sets the price, then it is a normal direct order (the buyer pays the
    seller directly). The server accepts requests only for items on that
    seller's own website.
  - **No price, or "Get Quote":** no Buy Now.
- **Consequences:** `orders.listed_price_text` and the `requested` status
  (migrate64), `lib/sectionItemPurchase.ts` (one rule for every card list),
  and the Studio `ProductPicker`. The popup always reloads a linked product,
  so a card's typed price never overrides the real one.
- **Related documentation:** [API](../docs/backend/API.md) (`/api/direct-orders/requests`, `/set-price`) — PRs #123 and this one

### 2026-10-17 — The business profile page shows the published website

- **Status:** Proposed (accepted when its pull request merges)
- **Context:** The business profile page (`/profile/<id>?view=business`)
  rendered the category template's sample sections from `business_sections`
  (for example "Electronics Appliances Standard · From $16"). Owners cannot
  edit those cards or link them to products, so they bypassed the Studio
  site's product links and requests.
- **Decision:** The page shows the business's published Studio site: the most
  recently updated published showroom with that `business_id`, read through
  `GET /api/showrooms` (which applies expiry, private-business and the 24-hour
  post-plan grace rules for visitors). It uses the same `SectionRenderer` and
  Buy flow as the site page, and `PurchaseModal` gets the site's id. The
  template sections are only a fallback when there is no published site.
- **Consequences:** The owner's Edit and View site buttons open that site.
  A site with its own contact section replaces the page's built-in contact
  block. The profile's business list matches a site to its business by
  `business_id` first (titles may differ), and by name only for sites without
  a link, so a linked site no longer appears as a second business.
- **Related documentation:** `frontend-next/components/profile/BusinessProfile.tsx`, `frontend-next/test/profile/BusinessProfile.site.test.tsx`


### 2026-10-17 — Showroom Studio is manual, publish-only, and laid out per device

- **Status:** Proposed (accepted when its pull request merges)
- **Context:** Studio's toolbar held about 25 controls in one sideways-scrolling
  row with Publish last (off-screen at 768px and below); the phone Sections tab
  left about 110px for the list; the tablet sections drawer covered the
  preview. Studio also offered "Export HTML" and "Copy code", and the floating
  AI assistant sat over the form.
- **Decision:** (owner) Websites are published **only on NodBusiness**: the
  HTML export, copy-code and raw-HTML preview are removed (a full-screen
  in-app preview replaces the last). Studio has **no AI inside**: every word,
  photo and price is entered by the owner, and the AI assistant is hidden on
  the Studio route. One top bar on every screen (Back, name and save status,
  Undo/Redo, Style, More, Publish), with Publish always visible. One layout is
  rendered at a time, chosen from Studio's own width: phone (under 520px: Edit
  or Preview, with Sections in a see-through panel over the preview, 40–100%,
  remembered), tablet (sections or editor beside the preview) and desktop
  (three columns from 960px). Undo groups typing in one field until a 1s
  pause; completion counts only the sections on the page.
- **Consequences:** The Sections list shows the page top to bottom with
  labelled move and remove buttons, plus an Add catalogue (the dead
  `resources` entry is gone). The Studio e2e mock now gives the signed-in
  owner a Business profile, since publishing requires one (#117).
- **Related documentation:** `frontend-next/views/ShowroomCreate.tsx`, `frontend-next/components/showroom/studio/`, `frontend-next/hooks/useStudioLayout.ts`, `frontend-next/test/showroom/studioDevices.test.tsx`

### 2026-10-17 — Every Studio section works as shown, in words owners already use

- **Status:** Proposed (accepted when its pull request merges)
- **Context:** A strict review of the Studio sections found:
  - Inventory Catalog and Live Location rendered nothing on published sites
    (owners could pay for Pro and get an empty section).
  - Newsletter saved nothing.
  - The Save button and catalogue were missing from the preview, because the
    preview was a second, separate renderer.
  - Every photo was a pasted image address.
  - The site security policy blocked YouTube and map frames, so Video and Map
    could not show on a live site.
  - The Style font choice and WhatsApp button were never saved, and the fonts
    were never loaded.
  - The top button disappeared when the page had nothing to sell.
- **Decision:**
  - **One renderer.** Studio's preview renders through the published site's
    `SectionRenderer`.
  - **Product catalogue.** It lists the business's real products with search,
    categories and an optional "left in stock".
  - **Live location.** Visitors see the owner's last shared position (10
    minutes, by the existing API) on a map; only the owner sees "Share my
    location now".
  - **Email sign-up.** Addresses are stored in `showroom_newsletter_signups`
    (migrate66; public `POST /api/showrooms/:id/newsletter`, rate-limited, only
    for a published site with that section; owner-only `GET`). The owner sees
    them on their website page. They are personal data: never shown to
    anyone but the site owner, and deleted with the site.
  - **Forms in owners' words.** "Add photo" uploads replace image addresses.
    No colour, icon or map-embed codes in forms: those fields are hidden but
    kept, so existing sites are unchanged. Maps come from the typed address.
  - **Video and maps load.** The policy adds `frame-src` for
    youtube-nocookie/YouTube, Google Maps and OpenStreetMap.
  - **Style is saved.** Font and WhatsApp button are stored on the top
    section, and the fonts are self-hosted with `next/font`.
  - **The top button always lands.** It goes to the catalogue, then
    services, items or price list, then contact.
  - **Plain names.** Every section carries a plain name and a one-line purpose.
- **Consequences:** Section and field keys are unchanged (sites keep their data). `lib/showroomSectionFields.ts`
  (the older business-template editor) still uses image addresses and is a separate follow-up.
- **Related documentation:** `frontend-next/lib/builderSections.ts`, `frontend-next/components/showroom/SectionRenderer.tsx`, `frontend-next/components/showroom/BuilderPreview.tsx`, `backend/routes/showrooms.ts`, `backend/db/migrate66.js`, `frontend-next/test/showroom/sectionsLive.test.tsx`, `backend/test/db/newsletterSignups.db.test.js`

### 2026-10-17 — Studio pieces for local businesses: pay, hours, menu, offer

- **Status:** Proposed (accepted when its pull request merges)
- **Context:** Local businesses need four basics the Studio catalogue lacked:
  - where to send money
  - when they are open (the renderer's old hours block showed made-up
    default hours)
  - a menu
  - a time-limited offer
- **Decision:** Four new sections. Keys are registered in
  `backend/lib/builderSectionRequirements.js`, all on the **free tier**
  (owner may move them to a paid plan later).
  - `payment_info` (**How to pay me**) is a living piece. It reads the
    business's active `business_payment_accounts` through `GET
    /api/businesses/:id/checkout-info`, the same source as checkout, so it is
    never retyped and never out of date. Visitors don't see it when there
    are no accounts. The owner gets a link to add them.
  - `hours` (**Opening hours**) is a weekly picker. It shows "Open now" or
    "Closed now" in the visitor's local time, including hours past midnight.
    No placeholder hours are shown.
  - `menu` (**Menu**) has dishes grouped by the owner's own group names,
    with an optional photo. Order uses the existing buy and request-to-order
    flow.
  - `offer` (**Today's offer**) has a last day. After it, visitors don't see
    the offer and the owner sees a notice. The button goes to what the
    business sells.
- **Consequences:** Older template menus (`menu` with `items`) still render
  as before. The business edit page's payment section has a
  `#payment-accounts` anchor for the owner link.
- **Related documentation:** `frontend-next/components/showroom/NewPieces.tsx`, `frontend-next/lib/openingHours.ts`, `frontend-next/components/showroom/HoursField.tsx`, `frontend-next/lib/builderSections.ts`, `frontend-next/test/showroom/sectionsLive.test.tsx`

### 2026-10-18 — People-first interactions on posts, comments and profiles

- **Status:** Proposed (accepted when its pull request merges)
- **Context:** The owner asked for a post menu like other social apps (picture: reaction row + actions), chosen from best practice across platforms but fitted to NodBusiness, on both sides: what you control on your own posts, and how you interact with other people's posts, comments and likes. Posts had a single heart; comment emoji saved nothing; there was no hide, mute or report; blocks only applied to chat; the Privacy page showed settings it never saved.
- **Decision:**
  - **Reactions:** one per person per post: ❤️ 👍 😂 😮 😢 👏 🔥. They reuse the `likes` row, so existing likes become ❤️ and `like_count` is the total. They come with a "who reacted" list. Comments get reactions too (`comment_reactions`).
  - **The More button (bottom-right of the action bar)** opens the reaction row plus actions:
    - **Your own post:** edit, pin (up to 3, shown first on your profile), who can comment (everyone / followers / no one), hide reaction count, notifications off, copy link, share, delete.
    - **Someone else's post:** reply, save, copy link, share, save photo, follow, not interested (with Undo), mute, block (asks first), report with plain reasons.
  - **The top ⋯** keeps only the Personal/Business view switch.
  - **Comments:**
    - **Your own comment:** edit (shows "edited") and delete.
    - **Someone else's comment:** reply, copy, report, mute or block the author.
    - **On your own post:** restrict a commenter (their comments are seen only by them and you) and delete any comment.
  - **Blocks work both ways everywhere:** posts, comments, reactions, follows, search and new messages. Blocking ends follows both ways.
  - **Privacy settings are saved and enforced:**
    - who can see my posts: everyone / followers / only me (name and photo stay visible)
    - appear in search
    - who can comment on my new posts
    - who can message me: everyone / my followers / nobody
    - show my reactions
    - blocked, muted and restricted people are listed with undo
  - The rules live in `backend/lib/socialGraph.ts` (migrate67).
- **Consequences:**
  - Feeds and post lists filter by visibility, blocks, mutes and hidden posts.
  - The old `POST /api/posts/:id/like` still toggles ❤️.
  - Reports go to the existing moderation queue.
  - Not built yet: "turn on notifications for someone else's post" and a reach/insights view.
- **Related documentation:** `backend/lib/socialGraph.ts`, `backend/routes/social.ts`, `backend/routes/posts.ts`, `backend/db/migrate67.js`, `frontend-next/components/feed/PostMoreMenu.tsx`, `frontend-next/components/feed/CommentMenu.tsx`, `frontend-next/views/PrivacyAndSecurity.tsx`, `backend/test/db/socialInteractions.db.test.js`, `frontend-next/test/feed/PostInteractions.test.tsx`

### 2026-10-18 — Scan a barcode or QR code to add products

- **Status:** Proposed (accepted when its pull request merges)
- **Context:** The owner asked for a supermarket-style way to add products: point the phone at a product's barcode or QR code and have the details fill in by themselves, plus a till-like quick mode for many items. Adding a product used to mean typing everything.
- **Decision:**
  - **Where details come from, in order:**
    1. the seller's own products (offer Add stock instead of a duplicate)
    2. the shared NodBusiness catalogue
    3. the free open databases (Open Food Facts, Open Beauty Facts, Open Products Facts)
    4. not found: the owner types it once
  - **The shared catalogue shares only the description of the product:** name, description, category, brand, size and first photo, taken from other sellers' active products of public businesses. It **never** shares price, stock, cost, supplier or anything from private businesses.
  - **Open data is credited where it is used** ("Filled from Open Food Facts"; CC BY-SA).
    - Their photos are copied into our storage on save. Only from their image hosts, with type, size and bytes checked.
    - Answers are cached for 30 days.
    - "Not found" is cached for 3 days, and only when every database actually answered. A timeout is never remembered as "not found".
  - **One barcode per product per seller.** Scanning a product you already sell offers Add stock.
  - **Quick scan mode** (`/products/scan`):
    - The camera stays open; a repeat scan adds +1.
    - New products need a price.
    - The list stays on the device until "Save all", which saves everything or nothing.
  - **No AI:** details come from real product records. The form's existing optional "AI Generate" description button is unchanged.
  - **Camera permission:** the site's `Permissions-Policy` changes from `camera=()` (camera blocked everywhere, including the verification selfie) to `camera=(self)`. Third-party frames still can't use it.
  - Without a camera, the owner can type the number or pick a photo of the barcode.
- **Consequences:**
  - Products gain `barcode`, `manufacturer` and `unit` in the API.
  - Migration `migrate68` adds the `barcode_lookups` cache and a barcode index.
  - The backend makes outbound requests to the three open databases.
  - Available on every plan.
  - **Open (owner decision):** no product-count limit per plan is enforced anywhere today, for the normal form or for scan-batch.
- **Related documentation:** `docs/backend/API.md` (Products), `backend/lib/barcode.ts`, `backend/lib/productLookup.ts`, `backend/routes/products.ts`, `backend/db/migrate68.js`, `frontend-next/components/products/BarcodeScanner.tsx`, `frontend-next/views/ProductQuickScan.tsx`, `frontend-next/views/ProductCreate.tsx`, `backend/test/db/productScan.db.test.js`, `frontend-next/test/products/scan.test.tsx`

### 2026-10-18 — Messaging rules (audit part 1: server)

- **Status:** Proposed (accepted when its pull request merges)
- **Context:** The owner asked for a professional, end-to-end audit of Messages on both sides. The server audit found several problems:
  - No message ever created a notification: the insert was malformed and its error was swallowed.
  - Edit, delete and forward were served at paths the app didn't call.
  - Inquiries and group creation skipped "who can message me" and blocks.
  - People removed from a group kept receiving live messages.
  - A ban didn't close the socket, and demo sessions couldn't use it.
- **Decision:**
  - **One rules module, `backend/lib/messaging.ts`**, used by every route:
    - **Members:** `conversation_participants` is the source of truth. The legacy JSON columns are still written for older app versions.
    - **First contact:** starting a chat, inquiries, and adding someone to a group follow the other person's "who can message me" and blocks.
    - **Blocks:** while either person blocks the other, a one-to-one chat can't be used.
    - **Channels:** only admins post.
    - **Messages:** 1–4,000 characters. Photos and files must be https links. Replies must be in the same chat.
    - **Edit:** your own text messages, within **15 minutes**.
    - **Delete for everyone:** your own messages, within **24 hours**. "Delete for me" comes with read state in the next part.
    - **Groups:** up to **256** members. When the last admin leaves, the longest-standing member becomes admin.
    - **One-to-one chats:** can't be left, renamed, or deleted for both people.
    - **Rate limits:** 30 messages a minute and 20 new chats a minute per person.
  - **Paths:** message actions answer at `/api/messages/:id`, and the old paths stay.
  - **Notifications:** every message creates a `message` notification and push for the other members, never including anyone's email. Failures are logged, not hidden.
  - **Blocking from a chat:** behaves exactly like the social block, ending follows both ways.
  - **Socket:**
    - Removed people leave the chat room at once.
    - A ban disconnects for real.
    - A recovered connection is checked again.
    - Typing is throttled (3 s).
    - Demo sessions use the demo database.
- **Consequences:**
  - Some requests that used to "succeed" while doing nothing now get a clear error, with `messages_not_allowed` carrying the reason to show.
  - The app's group creation still sends profile IDs, so it now gets a clear error instead of a broken group. Fixed in the groups part (M6).
  - Site admins can still read any chat (unchanged).
  - **Found in the browser check:**
    - The empty toast area was an invisible strip over the bottom-right of every page, including the chat composer and Send button on tablets and desktops. It's now click-through.
    - The security policy turned an `http` API into `wss://` instead of `ws://`, so live chat never connected on local backends. Production (`https` → `wss`) was unaffected.
- **Related documentation:** `docs/backend/API.md` (Messages), `backend/lib/messaging.ts`, `backend/routes/messages.ts`, `backend/socket.ts`, `backend/test/db/messaging.db.test.js`, `backend/test/db/messagingSocket.db.test.js`

### 2026-10-18 — Messaging: unread, ticks, requests (audit part 2)

- **Status:** Proposed (accepted when its pull request merges)
- **Context:**
  - Nothing ever recorded that a chat was read, so unread counts only grew.
  - Every message showed ✓✓, even unread ones.
  - The chat list joined no rooms, so it relied on a 60-second poll.
  - The Privacy page's "Contacts only" last-seen choice was rejected by the server every time.
  - The owner chose real "Seen" with a privacy switch.
- **Decision:**
  - **Ticks:** ✓ sent; ✓✓ delivered, which the app reports whenever it receives a message on any page; blue ✓✓ seen when the chat is open and on screen.
    - **Read receipts** (Settings › Privacy, on by default): when either person turns them off, neither sees "seen" in that chat. This is enforced on the server.
    - **Groups:** a tick needs every other member.
  - **Requests:** a first message from someone you don't follow waits in Requests. Accepting or replying moves it to Chats. Its notification says "Message request from…".
  - **Mute** for 8 hours, 1 week or always: no notifications, and the chat leaves the badge. **Archive** hides a chat until a new message arrives (unless it's muted).
  - **Delete for me:** "Delete chat for me" (and "Clear history") hides the history for you only, until someone writes again. Single messages can also be deleted for you only.
  - **Messages badge:** the number of chats with unread messages. It shows on the sidebar, in the phone drawer, and as a new Messages icon in the phone header. Message notifications count there instead of on the bell, and there's no popup for the chat you're in.
  - **Last seen:** Everyone / Nobody, in one setting on the Privacy page. The copy in the new-chat menu became a link to it.
  - **Live:** chat list, badge and ticks update through each person's own socket room.
    - The socket always uses the current access token.
    - Rooms are joined again after a reconnect.
    - Closing the layout no longer removes every listener in the app.
- **Consequences:**
  - `migrate69` adds per-member read, delivery, request, mute, archive and hide state, plus `user_profiles.read_receipts` and `message_hidden`. Existing chats are marked accepted once.
  - The Requests, Archived and Muted tabs come with the chat UI rebuild (M5). Until then, requests show in the normal list.
- **Related documentation:** `docs/backend/API.md` (Messages), `backend/db/migrate69.js`, `backend/routes/messages.ts`, `frontend-next/lib/readReceipts.ts`, `frontend-next/lib/useMessagesBadge.ts`, `frontend-next/lib/socket.ts`, `backend/test/db/messagingReadState.db.test.js`, `frontend-next/test/messaging/readReceipts.test.tsx`

## Adding a decision

For each durable decision, include a date, status, decision owner (only when
known), context, chosen option, rationale, and consequences. Link the affected
ADR/spec/runbook. Do not turn an assumption into a decision; keep unresolved
items in the open list until confirmed.

### 2026-10-18 — Feed Spotlight

- **Status:** Accepted
- **Decision owner:** Project owner (@Sent)
- **Context:** Business owners wanted a way to show followers one or more of their showroom sections directly in the feed, below the business card, so that followers can interact with products, services, and contact info without navigating to the full showroom page.
- **Decision points:**
  1. Three new columns on `showrooms` (`migrate74`): `spotlight_mode TEXT CHECK('single','carousel')`, `spotlight_section_ids JSONB DEFAULT '[]'`, `spotlight_carousel_count INTEGER DEFAULT 1`.
  2. Only showrooms with `spotlight_mode IS NOT NULL` render a widget in the feed. Business owners who do not configure spotlight are unaffected.
  3. Dedicated `PATCH /api/showrooms/:id/spotlight` endpoint (owner-only) for targeted field updates; the existing `PUT` also writes these fields naturally.
  4. Feed widget (`FeedSpotlightWidget.tsx`) is a lightweight bespoke renderer — does not import the full `SectionRenderer` to avoid carrying map/video/live-location dependencies into the feed bundle.
  5. Product quick-view uses a bottom drawer (`SpotlightProductDrawer.tsx`) with framer-motion slide-up; purchase flow delegates to `PurchaseModal`. Contact Seller delegates to `findOrCreateConversation` (same pattern as the main feed).
  6. Carousel auto-play is fixed at 4 seconds, not configurable by the business owner.
  7. Studio config panel (`FeedSpotlightPanel.tsx`) lives in the `MoreMenu` popover overlay to avoid restructuring the Studio layout columns. A live preview (`FeedSpotlightPreview.tsx`) shows below the config panel so the owner can see the result before publishing.
  8. Seed data: the first four seed showrooms get spotlight configs (single/hero, single/items, single/contact, carousel/3 sections) for visual demo and testing without manual setup.
- **Related documentation:** `backend/db/migrate74.js`, `backend/routes/showrooms.ts`, `frontend-next/components/feed/FeedSpotlightWidget.tsx`, `frontend-next/components/feed/SpotlightProductDrawer.tsx`, `frontend-next/components/feed/BusinessShowroomFeed.tsx`, `frontend-next/components/showroom/studio/FeedSpotlightPanel.tsx`, `frontend-next/components/showroom/studio/FeedSpotlightPreview.tsx`, `frontend-next/views/ShowroomCreate.tsx`
