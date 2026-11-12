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
| Backend Express version | Root `README.md` describes Express 4; `backend/package.json` currently declares Express 5. | ✅ Resolved 2026-10-31 — `README.md` updated to Express 5. Treat `package.json` as authoritative. |
| Frontend hosting | `frontend-next/README.md` mentions Cloudflare Pages, while root project docs describe Vercel. | ✅ Resolved 2026-10-31 — `frontend-next/README.md` updated to Vercel throughout. Active deployment is Vercel as confirmed by `ENVIRONMENT_VARIABLES.md` and CI/CD workflows. |
| Local developer setup | `docs/ONBOARDING.md` and root `README.md` have differing and partially duplicated setup instructions. | ✅ Resolved 2026-10-31 — `docs/ONBOARDING.md` is the canonical local setup guide. Root `README.md` links to it for detail. |

## Open decisions

- ~~Confirm and document one canonical local setup path~~ ✅ Resolved 2026-10-31 — `docs/ONBOARDING.md` is canonical.
- ~~Confirm the active frontend hosting target~~ ✅ Resolved 2026-10-31 — Vercel confirmed; `frontend-next/README.md` updated.
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

### 2026-10-24 — Every product belongs to a business; the plan rule applies to all of them

- **Status:** Accepted
- **Decision owner:** Project owner (chosen in the launch-audit fix session, 24 Oct 2026)
- **Context:** The launch audit (FUNC-03, UX-08) found that products listed from the normal "Add Product" form were saved without a `business_id`. Checkout looks up payment details through the product's business, so these products could never be ordered, and the Buy sheet showed no action at all. Unlinked products also skipped the existing rule that a business's products are listed and sold only while the business has a paid plan.
- **Decision points:**
  1. A product belongs to its own `business_id`, else its showroom's business, else the seller's business when the seller owns exactly one. Product creation stores that business; checkout and `POST /api/direct-orders` resolve it the same way at read time (`backend/lib/productBusiness.ts`).
  2. A seller with several businesses picks one on the product form ("Sold by").
  3. **The paid-plan rule applies to every business product.** Products of a business without an active paid plan are hidden from buyers until the owner chooses a plan, as for showroom products. (Rejected: keeping unpaid owners' products listed but unbuyable.)
  4. `POST /api/products` returns `payment_ready` and `checkout_blocker` (`no_business`, `no_plan`, `no_payment_method`). The form tells the seller what is missing, with a link to fix it.
  5. When a seller has no payment method, the Buy sheet offers "Message <seller>" (or "Sign in to message" for guests) instead of a dead end; the seller viewing their own product gets "Add a payment method".
- **Consequences:**
  - `migrate77` backfills `business_id` for existing products with no business and no showroom whose seller owns exactly one business. On production this links existing listings, and listings of unpaid businesses disappear from the marketplace.
  - Sellers with several businesses keep unlinked older products until they edit them.
- **Related documentation:** `docs/backend/API.md` (POST /api/products, checkout-info), `backend/lib/productBusiness.ts`, `backend/db/migrate77.js`, `backend/routes/products.ts`, `backend/routes/directOrders.ts`, `frontend-next/views/ProductCreate.tsx`, `frontend-next/components/checkout/PurchaseModal.tsx`, `backend/test/db/productBusiness.db.test.js`, `frontend-next/e2e/buy-normal-product.spec.ts`

### 2026-10-24 — The platform never makes factual claims on a seller's behalf

- **Status:** Accepted
- **Decision owner:** Project owner (approved the launch-audit fixes, 24 Oct 2026)
- **Context:** The launch audit (LEGAL-01, LEGAL-04) found the platform stating things as fact that nobody had entered or measured:
  - business templates promised "Nationwide shipping", "7-day return policy", "Pay on Delivery", "10+ Years", "500+ Deals", opening hours and "Up to 70% off — today only!" on new businesses' public pages
  - the product page always said "Delivery available"
  - the sidebar showed hard-coded "trending" post counts and a "10,000+ users" claim

  These are misleading commercial claims under the EU UCPD, the FTC Act §5 and Ethiopia Proclamation 813/2013.
- **Decision:**
  1. Templates may hold layout and neutral headings, but no facts about delivery, payment, returns, guarantees, experience, counts, hours or discounts. The owner adds those. `test/businessTemplateClaims.test.ts` enforces this.
  2. Product and business pages only show delivery, returns or payment promises the seller set.
  3. Any number shown as a fact (trending counts, user totals) must come from real data. With no data, the block is hidden.
- **Consequences:**
  - The sidebar trending card uses `GET /api/hashtags/trending` (real users' posts only) and stays hidden until real posts use hashtags.
  - None of the 8 publicly listed businesses carried the old template claims (read-only check), so no data cleanup was needed.
- **Related documentation:** `frontend-next/lib/businessTemplates.ts`, `frontend-next/components/layout/AppLayout.tsx`, `frontend-next/views/ProductDetail.tsx`, `frontend-next/test/businessTemplateClaims.test.ts`

### 2026-10-24 — Business Spotlight: one selling section, at its real size, on every card

- **Status:** Accepted
- **Decision owner:** Project owner (requirements given 24 Oct 2026)
- **Context:**
  - The spotlight only appeared on business-feed cards built from a published showroom, and used its own cut-down mini panels.
  - The personal feed's business view and the user-profile business card showed no spotlight.
  - Demo businesses never qualified, because they are shown from their business profile, and a demo-only rule limited the pick to "services" or "about".
- **Decision:**
  1. **Same card everywhere:** the business feed, the personal feed's business view and the user profile show the same card. It merges the business with its published site (`frontend-next/lib/feedBusiness.ts`).
  2. **Same rules for every account:** the spotlight follows one set of rules (`frontend-next/lib/spotlight.ts`), demo or real, showroom or business profile.
  3. **Real size:** a spotlight shows one section at a time, at its real size and layout, rendered by the site's `SectionRenderer`. Catalogue sections show the business's real products.
  4. **Fallback:** when no section has anything to show, the spotlight shows the business's own products (unless the owner turned it off).
  5. **Three modes:**
     - **Automatic (default):** the highest-priority selling section with content.
     - **Off.**
     - **Chosen sections:** one shows alone; several play as a carousel in priority order. Chosen sections that are empty or aren't selling sections fall back to Automatic.
  6. **Priority:** product catalogue → items → menu → services → packages/pricing → offer → events → gallery → portfolio → about/story (about only with a picture).
  7. **Selling points only:** never the hero, contact, location/map, hours or other details the card already shows.
- **Consequences:**
  - The Studio "Spotlight" panel offers Automatic / Choose sections / Off, lists only selling sections, and previews the real sections. The "visible at once" counter was removed.
  - The old `FeedSpotlightWidget` and `SpotlightProductDrawer` were deleted, along with the feed card's separate services preview and the profile's category lists.
  - Automatic launch posts now store the author's name and picture; `migrate80` backfills older posts that showed "Unknown".
- **Related documentation:**
  - Code: `frontend-next/lib/spotlight.ts`, `frontend-next/lib/feedBusiness.ts`, `frontend-next/components/feed/BusinessSpotlight.tsx`, `frontend-next/components/feed/BusinessShowroomFeed.tsx`, `frontend-next/components/feed/PostCard.tsx`, `frontend-next/components/showroom/studio/FeedSpotlightPanel.tsx`
  - Migrations: `backend/db/migrate80.js`
  - Tests: `frontend-next/test/feed/spotlight.test.ts`, `frontend-next/test/feed/businessSpotlight.test.tsx`

### 2026-10-25 — Messages M3: the business inbox

- **Status:** Accepted
- **Decision owner:** Project owner (messaging plan, Oct 2026: "Business inbox")
- **Context:** Customers messaging a business reached the owner's personal chat and saw their personal "last seen". Owners mixed customer questions with personal chats. Nothing in the chat showed which product or order a question was about.
- **Decision:**
  1. **Separate chat:** a customer-to-business chat is its own conversation (`conversations.business_id`), one per customer and business, apart from any personal chat with the owner.
  2. **Business identity:** the customer sees the business (name, logo, "Business"), never the owner's personal presence. The owner answers from a **Business** tab, and each row is badged with the business name.
  3. **Privacy:** the owner's personal "who can message me" doesn't block customers from reaching the business. Blocks still apply. Owners can only start a chat with a customer from one of that customer's orders.
  4. **Context cards:** a chat opened from a product, showroom or order gets a card snapshotting the item's title and photo, linking to the live page, never a price. The server checks that the item belongs to the business.
  5. **Quick replies:** owners keep up to 20 saved replies.
  6. **Server-made cards only:** `product`, `order_update` and `context` messages are created only by the server from real records. The send route refuses them, because before a sender could invent a product price or a paid order status. Products are shared through `POST /api/messages/share-product`.
- **Consequences:**
  - `migrate81` adds `conversations.business_id`, `business_quick_replies` and the message types `product`, `order_update` and `context`. The old CHECK allowed only text/image/file, so FEAT-004 product sharing failed in production until this change.
  - "Message" buttons on products, showrooms, orders and business cards open the business chat (`useStartChat`).
- **Related documentation:**
  - Docs and migration: `docs/backend/API.md` (Messages), `backend/db/migrate81.js`
  - Code: `backend/routes/messages.ts`, `backend/lib/messaging.ts`, `frontend-next/lib/messaging.ts`, `frontend-next/components/messaging/ContextCard.tsx`, `frontend-next/components/messaging/QuickReplies.tsx`
  - Tests: `backend/test/db/messagingBusiness.db.test.js`, `backend/test/db/messageCards.db.test.js`

### 2026-10-25 — Messages M4: every emoji, and pins on screen

- **Status:** Accepted
- **Decision owner:** Project owner (messaging plan, Oct 2026: "full emoji everywhere"; picker choice: "Use emoji-mart")
- **Context:** Post and comment reactions were limited to seven emojis by database CHECKs. Message reactions accepted any string up to 20 characters, and their chips showed "[object Object]". The chat's "+" only said "coming soon", the chat and comment boxes had no emoji button, and pinned messages had no bar to see them.
- **Decision:**
  1. **Any single emoji** is a valid reaction on posts, comments and messages. The server checks it (`backend/lib/emoji.ts`: one grapheme that is an emoji, flag or keycap, at most 32 characters); the database keeps only a length guard.
  2. **Picker:** emoji-mart (MIT), using the device's own emoji. It is loaded only when someone opens it, so no page bundle grows. The quick row of seven stays first, with "+" for everything else.
  3. **Typing emoji:** a smiley button in the chat box and the comment box inserts at the cursor.
  4. **Pins:** a bar at the top of the chat shows the newest pin; each tap jumps to a pin and moves to the next older one.
- **Consequences:**
  - `migrate82` drops the old reaction CHECKs on `likes` and `comment_reactions` and adds length checks there and on `message_reactions`.
  - Tapping your own reaction chip in a chat removes it.
- **Related documentation:**
  - Docs: `docs/backend/API.md` (Posts → Reactions, Messages → Reactions and pins)
  - Code: `backend/lib/emoji.ts`, `backend/db/migrate82.js`, `frontend-next/components/ui/EmojiPicker.tsx`, `frontend-next/components/ui/EmojiInsertButton.tsx`, `frontend-next/components/feed/ReactionPicker.tsx`, `frontend-next/components/messaging/MessageReactions.tsx`, `frontend-next/components/messaging/PinnedBar.tsx`
  - Tests: `backend/__tests__/emoji.test.ts`, `backend/test/db/socialInteractions.db.test.js`, `backend/test/db/messaging.db.test.js`, `frontend-next/test/messaging/emojiReactions.test.tsx`

### 2026-10-25 — Business cards: one size, with a sliding Spotlight strip

- **Status:** Accepted. Replaces the "real section size" part of "Business Spotlight" (24 Oct 2026); its selection rules stay.
- **Decision owner:** Project owner (25 Oct 2026: "every business profile has the same size … slidable … not exceed the red rectangle")
- **Context:** Showing a section at its real site size made feed cards very different heights, from a short About block to a long product grid.
- **Decision:**
  1. **Same size:** every business card in the business feed and in the personal feed's Business Profile view has the same size (480 px on phones). The header has fixed rows: name, owner, tagline and address, each on one line.
  2. **Fixed strip:** the Spotlight is one strip, 248 px tall. It shows the chosen section as small cards (picture, name, price, Order/Book, or View for products).
  3. **Sliding:** more cards than fit slide sideways. Arrows sit on the sides, dots below, and touch screens swipe; it snaps to each card and respects reduced motion.
  4. **Section types:** About, story and offers show as one wide card (picture and shortened text). Gallery and portfolio show as picture cards.
  5. **Several sections:** chosen sections switch with labels at the top of the same frame. They no longer rotate on their own.
  6. **Empty or off:** when the Spotlight is off or has nothing to show, the same space shows the business description and a Visit link.
- **Consequences:**
  - The feed no longer uses `SectionRenderer` for spotlights. `lib/spotlightTiles.ts` turns each section into cards.
  - Catalogue spotlights load up to 12 products, which slide.
  - On phones under 400 px wide, the card's Message button shows only its icon, so the action row fits.
- **Related documentation:**
  - Code: `frontend-next/components/feed/BusinessSpotlight.tsx`, `frontend-next/lib/spotlightTiles.ts`, `frontend-next/components/feed/BusinessShowroomFeed.tsx`
  - Tests: `frontend-next/test/feed/businessSpotlight.test.tsx`

### 2026-10-25 — Messages M5: chat screens rebuilt

- **Status:** Accepted
- **Decision owner:** Project owner (messaging plan, Oct 2026: "M5: rebuild the messages screens and remove Save and Copy link")
- **Context:** The chat screen was one 1,400-line file. Its message menu had Save, Copy link and Translate, which did nothing useful. Delete needed a confusing "tap again". The inbox opened on a contacts list, and its Business tab filtered a list that never contained business chats, so it was always empty. Requests and Archived had no place in the app, and tablets and computers showed one screen at a time.
- **Decision:**
  1. **Parts:** the chat is built from parts in `components/messaging/`: `ChatHeader`, `MessageList`, `MessageBubble`, `MessageActions`, `Composer`, `ForwardDialog`, `ChoiceDialog`, `NewMessageDialog`, `Inbox` and `MessagesShell`. Naming rules live in `lib/chatDisplay.ts` and action rules in `lib/chatRules.ts`.
  2. **Message actions:** react, Reply, Copy, Forward, Pin (up to 3 per chat), Edit (own text, 15 minutes), Delete (for me, or for everyone on your own message within 24 hours) and Report. Save, Copy link and Translate are removed.
  3. **Chat menu:** View profile, Mute (8 hours, 1 week, always), Archive, Block, Report, Leave (groups and channels) and Delete chat for me. A message request shows Accept / Block / Delete at the top.
  4. **Reading:** the chat opens on the newest 50 messages and older ones load as you scroll up, keeping your place. A "New messages" line, day separators, "Jump to latest" with a count, clickable links, and photos in the full-screen viewer.
  5. **Writing:**
     - The box grows with the text and keeps a draft per chat.
     - On a computer Enter sends and Shift+Enter adds a new line; on a phone Enter adds a new line.
     - Up to 10 photos at once, with progress.
     - A failed send stays as "Not sent · Tap to retry".
  6. **Inbox:** opens on Chats. Tabs are Business (when you have customers), Requests (when there are any), Groups and Archived. Long-press or right-click a chat to mute, archive or delete it. "New message" searches people.
  7. **Layout:** phones show the list or a full-screen chat. Tablets and computers show the list on the left and the chat on the right.
- **Consequences:**
  - No backend change. The UI uses existing endpoints: `box=business|requests|archived`, mute, archive, accept, delete for me, `before` paging and `/api/moderation/report`.
  - Not done yet:
    - Strings are not yet moved to `locales/` (they're English in the components).
    - The message list is paged, not virtualised.
    - The Members screen is M6, so its menu item is hidden until then.
- **Related documentation:**
  - Code: `frontend-next/views/ChatRoom.tsx`, `frontend-next/views/Messages.tsx`, `frontend-next/app/(app)/messages/layout.tsx`, `frontend-next/components/messaging/*`, `frontend-next/lib/chatDisplay.ts`, `frontend-next/lib/chatRules.ts`, `frontend-next/lib/useMediaQuery.ts`
  - Tests: `frontend-next/test/messaging/chatUi.test.tsx`

### 2026-10-25 — Messages M6: groups and channels

- **Status:** Accepted
- **Decision owner:** Project owner (messaging plan, Oct 2026: "fix and keep groups and channels")
- **Context:** Creating a group or channel sent profile ids instead of user ids through a generic helper, so it failed. There was no Members screen, and the chat menu link to one led nowhere. There was no way to make someone admin, and open chats didn't notice member changes.
- **Decision:**
  1. **Creating:** one dialog for groups and channels, with a name, a description for channels, and people picked by name. A group needs at least one other person; a channel can start with only its admin. The server's reason is shown when someone can't be added.
  2. **Group info screen** (`/messages/[id]/members`):
     - name, description and members with their roles
     - **Admins:** rename, add people (only people they could message), remove, make admin or take it back, and delete the group
     - **Everyone:** leave; the last admin leaving hands the group to the longest-standing member
  3. **Roles:** `PUT /conversations/:id/members/:userId` changes a role, and a group always keeps one admin. In channels only admins post. Up to 256 members.
  4. **Live:** member, role and name changes send `members_changed` to each affected person's own room. Open chats and the info screen reload, and a removed person's chat closes.
- **Related documentation:**
  - Docs: `docs/backend/API.md` (Messages → Groups)
  - Code: `backend/routes/messages.ts`, `backend/socket.ts`, `frontend-next/components/messaging/CreateGroupDialog.tsx`, `frontend-next/components/messaging/PeoplePicker.tsx`, `frontend-next/views/ChatMembers.tsx`
  - Tests: `backend/test/db/messaging.db.test.js`, `backend/test/db/messagingSocket.db.test.js`, `frontend-next/test/messaging/groups.test.tsx`

### 2026-10-25 — Messages M7: two-person end-to-end proof

- **Status:** Accepted
- **Decision owner:** Project owner (messaging plan, Oct 2026: "M7: two-person tests on phone, tablet and desktop")
- **Context:** Messaging had unit and database tests, but nothing proved two people could actually talk through the real screens on real devices.
- **Decision:**
  1. **One suite** (`frontend-next/e2e/messaging.spec.ts`) drives three people at once through the real UI. It runs on a phone, an iPhone (WebKit), a tablet (WebKit) and a computer.
  2. **Fresh accounts:** each device run reseeds its own accounts (`backend/db/seed-e2e-messaging.js`). The seed refuses any non-local database and needs `ALLOW_E2E_SEED=1`.
  3. **CI:** `.github/workflows/e2e-messaging.yml` runs on messaging changes and on demand, against a Postgres on the runner and a production build. It isn't a required check yet.
- **Consequences:** the suite found three bugs, fixed in the same change:
  - a message sent while a chat was still loading vanished
  - "Message" tapped before the sign-in was restored sent a signed-in person to the login page
  - a message written offline wasn't sent if the live connection survived the blip
- **Related documentation:**
  - Docs: `docs/Production/frontend-next/e2e.md`
  - Code: `frontend-next/e2e/messaging.spec.ts`, `frontend-next/playwright.config.ts`, `backend/db/seed-e2e-messaging.js`, `frontend-next/views/ChatRoom.tsx`, `frontend-next/lib/messaging.ts`

### 2026-10-25 — One profile per person in every list

- **Status:** Accepted
- **Decision owner:** Project owner (25 Oct 2026: "why repeatedly show one user more than one in contacts list and chat list … fix from the root cause")
- **Context:** A person can have several `user_profiles` rows: a personal one and one per business. Production had 52 such people with up to 3 rows each, and nothing enforces one row per person. Every query that joined `user_profiles ON user_id` repeated rows once per profile. Chats appeared three times in the chat list, and people repeated in contacts and search, friends, stories, "who reacted", the blocked list, reviews and returns. Partner payout order counts were multiplied the same way.
- **Decision:**
  1. **Shared rule:** every backend query reads a person's profile through `backend/lib/personProfile.ts` (`personProfileJoin`): exactly one row, the personal profile if there is one, else the oldest.
  2. **People search:** results are one per person.
  3. **Frontend:** contact suggestions and search results are reduced to one entry per person, and the chat list to one row per chat (`uniquePeople`, `uniqueChats` in `frontend-next/lib/chatDisplay.ts`).
- **Consequences:**
  - **Data untouched:** existing profile rows are left as they are.
  - **Open decision:** whether business profiles should stay separate rows, and whether to merge duplicate personal profiles, is still to be decided. A unique index would need that decision first.
- **Related documentation:**
  - Code: `backend/lib/personProfile.ts`, `backend/routes/messages.ts`, `backend/lib/messaging.ts`, `backend/routes/search.ts` and the routes that join profiles
  - Tests: `backend/test/db/messaging.db.test.js` ("people with several profiles"), `backend/test/db/personProfiles.db.test.js`, `frontend-next/test/messaging/uniquePeople.test.ts`

### 2026-10-26 — Photo uploads: checked by file signature

- **Status:** Accepted
- **Decision owner:** Project owner (26 Oct 2026: "I can't … post multiple pictures")
- **Context:** The upload check (SEC-005) asked the `sharp` image library to read each photo. That refused every photo whenever uploads were stored on disk, because only 12 bytes were passed. It also refused HEIC photos from phones, which the prebuilt `sharp` can't read. Separately, the type filter refused photos sent without a file extension, which happens when a phone picks from its gallery. In a chat, several of a batch of photos failed with only "couldn't be sent".
- **Decision:**
  1. **Signature check:** the real content is checked by its format signature (JPEG, PNG, GIF, WebP, HEIC/HEIF/AVIF, PDF) from its first 32 bytes. Something that isn't one of these is still refused.
  2. **Type and extension:** the declared type decides. An extension only has to agree when there is one.
  3. **Error message:** the chat shows the server's reason when a photo fails.
- **Consequences:** HEIC photos upload, but some browsers (Chrome) can't display HEIC. Converting HEIC to JPEG is a possible follow-up.
- **Related documentation:**
  - Code: `backend/middleware/upload.ts`, `backend/routes/upload.ts`, `frontend-next/views/ChatRoom.tsx`
  - Tests: `backend/__tests__/uploadValidation.test.ts`

### 2026-10-26 — Notification history: at least 7 days

- **Status:** Accepted
- **Decision owner:** Project owner (26 Oct 2026: "I need notification history at least 7 days")
- **Context:** Notifications were stored, but the page never showed them.
  - The list endpoint answers `{ notifications, next_cursor }`, and the page and the bell badge read it as a bare list. So the page always said "all caught up" and the badge stayed at 0.
  - Before 24 Oct the request failed outright (FUNC-01).
  - The page also asked for only the 30 newest, with no way back.
- **Decision:**
  1. **Page:** the Notifications page shows the whole last 7 days (`days=7`, up to 500), newest first and grouped by day. "Show older" pages further back with the cursor.
  2. **Bell badge:** it reads the real response.
  3. **Storage:** notifications are kept. Nothing deletes them except the person themselves or deleting their account.
- **Related documentation:**
  - Docs: `docs/backend/API.md` (Notifications)
  - Code: `backend/routes/notifications.ts`, `frontend-next/views/Notifications.tsx`, `frontend-next/components/layout/AppLayout.tsx`
  - Tests: `backend/test/db/notificationHistory.db.test.js`, `frontend-next/test/notifications.history.test.tsx`


### 2026-11-05 — Shared Claude Code setup: permission rules, skills, no MCP servers yet

- **Status:** Accepted
- **Decision owner:** Project owner (5 Nov 2026: approved "commit it to the repo" and "no MCP servers for now, scripts instead")
- **Context:** Agent work had no shared, versioned guardrails or procedures; work notes are spread across `.kiro/specs/`, `.agents/tasks/`, `implementation plan/` and `note/`.
- **Decision:**
  1. **Permissions:** `.claude/settings.json` denies reading or editing local `.env` files, force-push, `--no-verify` commits and staging `.env`; it pre-approves only read-only and check commands. Personal overrides go in the gitignored `.claude/settings.local.json`.
  2. **Skills:** `.claude/skills/` holds `local-stack`, `audit-finding`, `security-audit` and `a11y-audit`. Skills link to existing docs instead of repeating them; `AGENTS.md` stays the single source of working rules.
  3. **MCP servers:** none added. Reproducible scripts and Playwright are used instead. A server may be added later only if it is official or well maintained, pinned to an exact version, least-privilege, pointed at the local stack, and documented in `.mcp.json` and `docs/`.
- **Consequences:** Every Claude Code session in this repo gets the same rules. Custom guard hooks (production, local-database and secret checks) are not part of this change; secret scanning in CI is tracked as an audit finding.
- **Open:** whether to consolidate `.kiro/specs/`, `.agents/tasks/` and `implementation plan/` into one location (owner decision).
- **Related documentation:** `CONTRIBUTING.md` (Agent tooling), `note/2026-11-05-international-audit/README.md`

### 2026-11-06 — Identity documents are private; viewable by admins only; kept until account deletion

- **Status:** Accepted (defaults chosen by the owner: "use the defaults and go ahead", 6 Nov 2026). Revisit the retention period with counsel.
- **Decision owner:** Project owner
- **Context:** Audit finding F-013: verification selfies and government IDs were stored as public uploads with guessable, non-expiring URLs; F-014: files were never deleted when an account was deleted.
- **Decision:**
  1. **Storage:** identity documents live in private storage (`PRIVATE_SUPABASE_BUCKET`, falling back to `RECEIPTS_SUPABASE_BUCKET`); rows hold a `private:` reference, never a URL. Production refuses uploads without a private bucket.
  2. **Who may view:** the person who uploaded them and admins only, through links that expire after 5 minutes (`GET /api/verification/:id/documents`).
  3. **Retention:** kept until the account is deleted; replaced documents are deleted when a new request is submitted.
  4. **Erasure:** deleting an account deletes the person's stored files (identity documents, profile images, post and story media, chat files) after the database change commits.
- **Consequences:** Production must set `PRIVATE_SUPABASE_BUCKET` (a bucket with public access disabled) and run `npm run migrate:verification-docs -- --apply` once to move existing documents. No admin screen shows the documents yet; admins use the API endpoint.
- **Open:** retention after review (delete on decision, or after N days) — owner and counsel.
- **Related documentation:** `docs/backend/API.md` (Verification), `docs/operations/ENVIRONMENT_VARIABLES.md`, `note/2026-11-05-international-audit/FIXES.md`

### 2026-11-06 — Accessible colour shades for text and white-on-colour fills

- **Status:** Accepted for the app (default applied while fixing audit F-041); **owner to confirm** the brand shades for print and marketing.
- **Decision owner:** Project owner
- **Context:** axe found 123 colour-contrast failures on 27 of 36 page states in light mode and more in dark mode. The brand amber `#F59E0B` with white text is 2.1:1; amber text on white 3.2:1; business theme colours such as the default gold `#D4AF37` 2.1:1. WCAG 2.2 AA needs 4.5:1 for normal text.
- **Decision:**
  1. `frontend-next/app/globals.css` redefines amber-500 `#b45309`, amber-600 `#92400e`, red-500 `#c81e1e`, green-600 `#157a3a`, yellow-600 `#a16207`, blue-500 `#2563eb`, and darkens `--muted-foreground` and `--destructive` in light mode. Lighter shades stay for decoration.
  2. Dark mode lightens the same text classes, turns pale `bg-*-50` tints into dark tints, and uses `#2563eb` as primary so white text on it passes; `text-primary` is lightened.
  3. Business-chosen colours keep their hue but are darkened or lightened only as far as needed (`frontend-next/lib/contrast.ts`).
- **Consequences:** Amber buttons and accents look deeper (orange-brown rather than bright amber). axe reports 0 contrast failures on 44 page states in both themes. The brand book still lists `#F59E0B` for primary CTAs; a note there points here.
- **Open:** owner to confirm the on-screen amber and whether the brand book should adopt it.
- **Related documentation:** `docs/product/ACCESSIBILITY.md` (Color Contrast), `docs/product/DESIGN_SYSTEM.md`, `docs/brand/BRAND_GUIDELINES.md`, `note/2026-11-05-international-audit/FIXES.md`

### 2026-11-06 — Nonce-based script policy; pages render per request

- **Status:** Accepted (owner asked to fix F-016, 6 Nov 2026)
- **Decision owner:** Project owner
- **Context:** The production Content-Security-Policy allowed `'unsafe-inline'` scripts, so injected markup such as F-057's map labels could run code. Next.js App Router pages carry inline scripts; the only supported ways to drop `'unsafe-inline'` are a per-request nonce (pages must render per request) or experimental SRI, which was tested and does not cover the per-page inline scripts (4 violations on every page).
- **Decision:** `frontend-next/proxy.ts` creates a nonce for every page request and sends `script-src 'self' 'nonce-…' 'strict-dynamic'` (`lib/csp.ts`); the root layout passes the nonce to the theme script. `X-Powered-By` is turned off. Inline styles stay allowed (React style attributes cannot carry a nonce).
- **Consequences:** The 52 pages that were prerendered as static files now render per request. Measured locally on a production build: about +5 ms server time per page (2.4 → 7.2 ms median). On Vercel these pages are no longer served from the CDN cache, so cold starts can add latency and function usage rises. No CSP violations on 9 guest and 18 signed-in pages; existing browser specs pass.
- **Open:** revisit if Next.js gains hash-based CSP for prerendered pages.
- **Related documentation:** `docs/infrastructure/SECURITY_HARDENING.md`, `docs/operations/TECHNICAL_DEBT.md` (TD-013), `note/2026-11-05-international-audit/FIXES.md`

### 2026-11-06 — Two-factor sign-in with authenticator apps; required for admins

- **Status:** Accepted (owner asked to fix F-017, 6 Nov 2026)
- **Decision owner:** Project owner
- **Context:** Audit finding F-017: no MFA, only a length rule for passwords, and an optional OTP secret.
- **Decision:**
  1. TOTP (RFC 6238) with 10 one-time recovery codes, built on Node crypto (no new dependency). Anyone can turn it on in Settings (`two_factor_auth` flag, default on).
  2. Sign-in (password, Google, email-code verification) answers with a 5-minute, single-use challenge instead of a session when it is on; codes cannot be replayed; 5 wrong codes lock for 15 minutes.
  3. Admins must use it: admin-only routes refuse until it is on (`ADMIN_MFA_REQUIRED`, default on in production). Admins cannot turn it off.
  4. Secrets are encrypted with a key derived from `MFA_ENCRYPTION_KEY`, falling back to `JWT_SECRET`.
  5. Passkeys (WebAuthn) are a later step.
- **Consequences:** After deploying, each admin signs in, opens Account settings and turns on two-factor sign-in before using admin tools. Migration 86 adds `user_mfa`. Rotating `JWT_SECRET` without `MFA_ENCRYPTION_KEY` set breaks existing setups (recovery codes still work); set `MFA_ENCRYPTION_KEY` in production to decouple them.
- **Open:** passkeys; whether business owners should also be required to use it.
- **Related documentation:** `docs/backend/API.md` (Two-factor sign-in), `docs/operations/ENVIRONMENT_VARIABLES.md`, `note/2026-11-05-international-audit/FIXES.md`

### 2026-11-06 — Migrations run once each, recorded in schema_migrations

- **Status:** Accepted (owner asked to fix F-009, 6 Nov 2026)
- **Decision owner:** Project owner
- **Context:** Audit finding F-009: every deploy re-ran all migrations, the server re-ran migrations 83–85 at every start, and nothing recorded what had run. CONTRIBUTING.md already described a `schema_migrations` table that did not exist.
- **Decision:** `backend/db/migrate-all.js` keeps `schema_migrations` with a sha256 checksum per file, runs only unrecorded migrations, refuses to continue when an applied file changed (`--rerun <file>` for deliberate re-runs), and uses a Postgres advisory lock. No manual backfill: the first run on an existing database executes everything once more (as every deploy did) and records it. Migrations must stay idempotent.
- **Consequences:** Deploys run only new migrations. Editing an applied migration now fails the deploy until it is moved to a new file or re-run on purpose. `npm run migrate:status` shows what is pending.
- **Related documentation:** `docs/infrastructure/MIGRATION_GUIDE.md`, `docs/backend/DATABASE.md`, `note/2026-11-05-international-audit/FIXES.md`

### 2026-11-06 — Page guide opens only on request by default; compliance docs no longer claim "Compliant"

- **Status:** Accepted (owner: "continue as you recommended", 6 Nov 2026, on the suggested defaults for F-031 and F-054)
- **Decision owner:** Project owner
- **Decision:**
  1. **F-031:** `page_guided_tours` now only decides whether the guide opens by itself on a first visit, and is **off** by default. The **Page guide** button always works. The guide never opens by itself on the sign-in, register and password pages.
  2. **F-054:** the Ethiopia data protection and GDPR documents say "Aligned, with known gaps — not a legal opinion" instead of "Compliant". The data protection proclamation number is marked "to be confirmed by counsel" (the document cited 1309/2024; the audit brief cites 1321/2024); the number was not chosen here.
- **Open:** counsel to confirm the proclamation number and obligations; update the status after the fixes are deployed and reviewed.
- **Related documentation:** `docs/product/PAGE_GUIDED_TOURS.md`, `docs/product/FEATURE_FLAGS.md`, `docs/compliance/ETHIOPIA_DATA_PROTECTION.md`, `docs/compliance/GDPR_AUDIT.md`

### 2026-11-06 — DevOps console: error triage routes added, Knowledge Base tab removed

- **Status:** Accepted (owner: "ok merge it and continue", 6 Nov 2026; the finding allowed either option)
- **Decision owner:** Project owner
- **Context:** Audit finding F-006: the admin console called 11 routes the backend did not have, and sent PATCH where the backend accepted only PUT.
- **Decision:**
  1. Implemented, admin only: error stats, `since` filtering, PATCH resolve, bulk resolve by level, convert an error to one bug ticket, and saving one version status at a time.
  2. Removed the Knowledge Base tab and its seven `/api/docs/*` calls. The backend image is built from `backend/` only, so `docs/` is not on the server; serving repository files from production would also add a file-reading endpoint for little value. The docs stay readable in the repository.
- **Update 2026-11-08:** the Task Log tab and its `GET /api/devops/log-report` routes are removed for the same reason (owner: "continue as you recommended"). The implementation log stays readable in the repository (`docs/log-report/`).
- **Related documentation:** `docs/Production/backend/routes/devops.md`, `docs/Production/frontend-next/views/DevOps.md`, `note/2026-11-05-international-audit/FIXES.md`

### 2026-11-06 — Migration ledger renamed to migration_ledger

- **Status:** Accepted (fix for the failed production deploy, run #525, 6 Nov 2026)
- **Decision owner:** Project owner
- **Context:** The first deploy after #178 stopped at "Run DB Migrations" with `column "name" does not exist`. Production already had a `schema_migrations` table from another tool, with other columns; `CREATE TABLE IF NOT EXISTS` kept it and the ledger query failed. Nothing ran and the backend and frontend deploys were skipped.
- **Decision:** The ledger table is `migration_ledger`. The existing `schema_migrations` table is left untouched. `migrate-all.js` checks the ledger's columns and stops with a clear message, before running anything, if a `migration_ledger` table has another shape. Supersedes the table name in the 2026-11-06 "Migrations run once each" entry.
- **Consequences:** The next deploy runs every migration once more (all idempotent, as every deploy did before) and records them. The owner may later inspect `schema_migrations` in Supabase and decide whether it is still needed.

### 2026-11-06 — Every product must belong to a business

- **Status:** Accepted (owner: "continue", 6 Nov 2026; fix as recommended in audit F-033)
- **Decision owner:** Project owner
- **Context:** A product with no business was accepted (201) but hidden from everyone except its seller.
- **Decision:** `POST /api/products` and new items in `POST /api/products/scan-batch` answer `422 BUSINESS_REQUIRED` when no business can be resolved (own `business_id`, the showroom's business, or the seller's only business). Admins follow the same rule. The product form says "Create a business first" and links to it.
- **Consequences:** Sellers create a business before listing. Existing products without a business are unchanged (migration 77 already linked those whose seller has exactly one business).

### 2026-11-07 — Proprietary licence; public accessibility statement

- **Status:** Accepted (owner chose "Proprietary" and the shared inbox as contact, 7 Nov 2026; audit F-055)
- **Decision owner:** Project owner
- **Decision:**
  1. The code is proprietary: `LICENSE` says all rights reserved, and every `package.json` has `"license": "UNLICENSED"` (npm's marker for code that may not be reused).
  2. An accessibility statement is published as the Accessibility tab of the legal page: target WCAG 2.2 AA, status partially conformant, known limitations, and the shared contact inbox (`CONTACT_EMAIL`), not a new address.
- **Open (F-055):** a Refund Policy tab needs the owner's or counsel's wording; an OpenAPI file and a docs freshness check are not done yet.
- **Related documentation:** `LICENSE`, `docs/compliance/ACCESSIBILITY_STATEMENT.md`

### 2026-11-07 — One colour system: blue primary, violet secondary, no decorative accent

- **Status:** Accepted (owner, 7 Nov 2026: "agree with major and secondary… don't need decoration for accent… follow like Facebook, LinkedIn"; audit F-046)
- **Decision owner:** Project owner
- **Context:** The two brand documents disagreed (blue vs amber as primary); the app used both, amber meant buttons, warnings and premium at once, and 2,259 raw palette classes plus ~100 hex colours bypassed the theme.
- **Decision:**
  1. Primary blue `#2563eb` for the main action and selection; its tint `#eff6ff` for highlighted areas. Secondary violet `#7c3aed` for the business identity and the AI assistant. Status colours (success, warning, error) only for states; red for unread counts. Neutrals for most of the screen. No gold, no decorative accent, no gradients in the app.
  2. Tokens in `app/globals.css`, mirrored for maps/charts in `lib/colorTokens.ts` (kept in sync by a test). `npm run check:colors` (in `npm run lint`) blocks raw palette classes, arbitrary colour classes and stray hex values.
  3. Exempt: colours each business chooses for its own showroom, other companies' brand colours (Google, Telegram, WhatsApp), the black-and-white logo, and the landing-page hero (the one marketing gradient).
- **Consequences:** New UI must use tokens. `docs/brand/COLOR_SYSTEM.md` is the source of truth; `BRAND_BOOK.md` and `BRAND_GUIDELINES.md` now point to it.

### 2026-11-08 — Logo recoloured: white on brand blue

- **Status:** Accepted (owner, 8 Nov 2026: "convert only the color of the logo to make similar with the app", chose "White on blue")
- **Decision owner:** Project owner
- **Decision:** The logo keeps its shape; only its colours change. The icon is a blue `#2563eb` disc or tile with a white globe ring, network lines (85% white) and boxes, and blue slots. The wordmark's globe is drawn in blue on light backgrounds; its letters stay ink. The white wordmark (dark backgrounds) gets blue slots. The intro videos map black → blue, white → white, greys → blue tints.
- **Consequences:** PWA icons, the Apple touch icon and the favicon are rebuilt from the SVG by `frontend-next/scripts/brand/render-icons.mjs`. Logo backgrounds in the splash, sign-in, landing and share image use `HEX.primary`; the colour guard no longer allows the old black. Docs: `docs/brand/COLOR_SYSTEM.md`, `BRAND_BOOK.md`, `BRAND_GUIDELINES.md`.

### 2026-11-08 — Small logo is a still of the animated logo; logo files are versioned by name

- **Status:** Accepted (owner, 8 Nov 2026: "let the small logo add globe inside the circle like the big one")
- **Decision owner:** Project owner
- **Decision:** The still icon is the last frame of the intro video (network of businesses over the globe, white on blue), cut to a circle, so the small and animated logos are the same picture. Logo files carry a version in their name (`-v2`) and are referenced only through `frontend-next/lib/brandAssets.ts`; when one changes, it gets a new name and the old name redirects (`next.config.ts`).
- **Why:** After the recolour, browsers that had cached the old files under the same name kept showing the black logo. A new name is never in any cache, so every visitor sees a changed logo on the next page load.
- **Consequences:** `scripts/brand/render-icons.mjs` builds the WebP icon, favicon, Apple touch icon and PWA icons from `nodbusiness-intro.mp4`. The icon SVG is retired. A unit test (`test/brand/brandAssets.test.ts`) keeps the names, files, manifest and service worker in step. Docs: `docs/brand/BRAND_BOOK.md`, `BRAND_GUIDELINES.md`.

### 2026-11-09 — Vector logo master; white-ring logo on blue; logo animation plays once

- **Status:** Accepted (owner, 9 Nov 2026: fix logo quality, use the white-ring logo on blue backgrounds, update the wordmark "o"; chose "Animate, end sharp" for sign-in and landing). Supersedes the 2026-11-08 entry "Small logo is a still of the animated logo".
- **Decision owner:** Project owner
- **Decision:** The logo is a vector drawing (`scripts/brand/build-logo.mjs`): blue disc, globe with Natural Earth continents, network lines and eight boxes. It has a white-ring version for blue backgrounds and bolder small versions for 24 px and below. `BrandLogo` takes `variant="onBlue"`; `Wordmark` shows the name with the icon as the "o" in the heavy sans (also used for the app header name). The intro video plays once on the landing hero and the sign-in pages, then fades to the vector icon; reduced motion or data saving shows the icon only. Sign-in may now load the small 62 KB video (the F-045 budget test allows only that file).
- **Why:** The raster still (cut from a compressed video frame) was blurry at small sizes; the blue disc vanished on blue backgrounds; the wordmark "o" was still the old thin mark.
- **Consequences:** PNG and ICO icons are rendered from the vector by `render-icons.mjs`. Files are `-v3`; v1 and v2 names redirect. The share image uses the ringed icon. Unit tests check that logos styled for blue use the ring version and that the icons are vectors.

### 2026-11-09 — An ended Demo session leaves Demo with an explanation

- **Status:** Accepted (owner asked to fix "We could not load business profiles" seen in a Demo session, 9 Nov 2026)
- **Decision owner:** Project owner
- **Decision:** When the API answers with `DEMO_SESSION_EXPIRED`, `DEMO_SESSION_INVALID` or `DEMO_DISABLED`, the web app stops trying to refresh, signs the browser out of Demo and opens `/landing?demo=ended` with a notice; Try Demo starts afresh. Load errors say "check your connection" only when no answer came back.
- **Why:** An ended session made every request fail while the Demo banner stayed on screen, and the feed blamed the visitor's connection.
- **Consequences:** `api/client.ts` (`isDemoEndedResponse`, `DEMO_ENDED_EVENT`), `lib/AuthContext.tsx`, `components/landing/DemoEndedNotice.tsx`, feed message. Tests: `test/demoEnded.test.tsx`, `e2e/demo-ended.spec.ts`. Docs: `docs/operations/DEMO_WORKSPACE_DEPLOYMENT.md`.

### 2026-11-09 — Business Analytics counts product saves, not likes

- **Status:** Accepted (owner, 9 Nov 2026: "Count saves")
- **Decision owner:** Project owner
- **Decision:** Products cannot be liked in Nodbusiness; people can only save (bookmark) them. Business Analytics shows **Product Saves**, read from `GET /api/saves/my-products`, which returns when each of the signed-in seller's products was saved, never who saved it (optional `business_id`). The CSV export uses the same figures.
- **Why:** The screen read product likes from a client stub that always returned nothing, so "Product Likes" was always 0.
- **Consequences:** `backend/routes/saves.ts`, index `idx_saves_target` (migrate88), `frontend-next/api/entities.ts` (`fetchMyProductSaves`), `views/BusinessAnalytics.tsx`, `lib/exportReport.ts`. Tests: `test/db/productSaves.db.test.js`, `test/exportReport.test.ts`, `e2e/business-analytics.spec.ts`. Revenue still counts every order; whether it should count only paid and completed orders is open with the owner.

### 2026-11-09 — Revenue on Business Analytics counts paid orders only

- **Status:** Accepted (owner, 9 Nov 2026: "Paid + completed only")
- **Decision owner:** Project owner
- **Decision:** Revenue (the stat, the 7-day sales series and the CSV "Total Revenue (paid orders)") is money received: orders with status `paid`, `processing`, `shipped`, `delivered` or `completed`. Unpaid (`pending`, `awaiting_payment`, `payment_reported`, `confirmed`), `cancelled`, `expired`, `refunded` and `disputed` orders do not count. The Orders count, status breakdown and recent orders still show all orders.
- **Why:** Revenue previously added every order, including cancelled and unpaid ones.
- **Consequences:** `frontend-next/lib/money.ts` (`isRevenueOrder`), `views/BusinessAnalytics.tsx`, `lib/exportReport.ts`, `components/analytics/StatCard.tsx` (`note`). Tests: `test/money.test.ts`, `test/exportReport.test.ts`, `e2e/business-analytics.spec.ts` (fails without the rule).

### 2026-11-12 — Auth infrastructure failures answer 503, not 401

- **Status:** Accepted (owner asked for it after a CI database test got 401 instead of 403 when Postgres ran out of connections, 12 Nov 2026)
- **Decision owner:** Project owner
- **Decision:** `requireAuth` answers 401 only for problems with the token or account (`UNAUTHORIZED`, `INVALID_TOKEN`, `TOKEN_EXPIRED`, `TOKEN_REVOKED`, `USER_NOT_FOUND`; any `jwt.JsonWebTokenError`); a banned account stays 403. Any other error while authenticating (the user lookup failing in Postgres) is logged and answered `503 { code: "AUTH_UNAVAILABLE" }`. `optionalAuth` still continues as a guest for a missing, invalid, revoked or banned token, but **answers the same 503 on an infrastructure error instead of continuing as a guest**: a silent guest downgrade would make guest-only routes answer `401 SIGN_IN_REQUIRED` (which the web app treats as an expired session) and could cache a guest response for a signed-in person. `next()` is called outside the `try` so errors from later handlers are never reported as auth failures.
- **Why:** Every error used to become `401 INVALID_TOKEN`; the web app's 401 interceptor then refreshed and cleared the session, so a short database outage signed people out.
- **Consequences:** `backend/middleware/auth.ts` (`isTokenError`, `authUnavailable`). The web app needs no change: it refreshes only on 401, `AUTH_UNAVAILABLE` is not a Demo-ended code, and `AuthContext` keeps the session on non-401 errors. Tests: `backend/__tests__/authUnavailable.test.ts`, `frontend-next/test/demoEnded.test.tsx`. Docs: `docs/backend/API.md` (status table), `docs/backend/SECURITY.md`. Not covered: `POST /api/auth/refresh` and Socket.IO handshake auth during an outage.
