# Website builder (Showroom Studio) audit — 14 Nov 2026

> Owner's request: audit and test "create showroom" strictly, to a professional,
> global standard; research 10–20 real professionally built websites that sell
> products or services; prove whether anyone can build a site at that level with
> the builder sections, working like those sites; remove customer ratings and
> testimonials from the builder and have the platform add them to every
> published website.

**Result:** 92 of 92 real-stack checks pass after the fixes below. Five sites
modelled on real professional websites were built from builder sections, published,
and every function on them was exercised in a real browser as a visitor, as a
customer and as the owner. 14 defects were found and fixed in this change; 9 gaps
against real websites remain and are listed with priorities for the owner to choose.

- Branch: `claude/showroom-audit-reviews`
- Decision: `project-brain/DECISIONS.md`, "Reviews are platform-owned and mandatory on every website" (2026-11-14)
- Re-run: `audit-run.mjs` in this folder (local stack only; see the end of this file)

## 1. Method

| Step | How |
|---|---|
| Research | Web search on real websites and design teardowns (sources in §8). The sandbox's network does not allow opening the sites directly, so structure comes from published breakdowns and the sites' own help pages. |
| Capability matrix | Every section and function those sites rely on, mapped to our section types: Supported, Partly, or Missing. |
| Rebuild | `audit-run.mjs` creates throw-away owners, businesses (Pro plan), products and a room type on the **local** stack, publishes five sites through the API with realistic content, and opens each public page in Chromium at 375 px and 1440 px. |
| Studio | A second owner uses the real Studio UI: template → edit the name → Publish → Unpublish → Publish again → Edit (address kept) → Delete. |
| Reviews | A customer with no order, a customer with a completed order, and a signed-out visitor each open a live site. |
| Unit and DB tests | Backend Jest (858), DB tests on real Postgres (46 suites, 384 tests, incl. the new lifecycle suite), Vitest (99 files, 662 tests). |
| Accessibility | axe-core, WCAG 2.2 AA, on every rebuilt site and on Studio. |

Screenshots in `shots/` show the real layout. Photos, the YouTube video and the
Google map render blank in them only because the sandbox cannot reach those hosts;
the checks confirm each embed is on the page with the right source.

## 2. Reference websites (16)

| # | Website | Type | What it relies on |
|---|---|---|---|
| 1 | Allbirds | Product shop | Full-width hero, product grid with prices, categories, product reviews, clean footer, cart |
| 2 | Bellroy | Product shop | Product grid, materials story, delivery and returns info, reviews |
| 3 | Warby Parker | Product shop + stores | Virtual try-on, store locator, product grid, booking eye exams |
| 4 | Glossier | Product shop | Hero, best sellers, reviews, newsletter |
| 5 | Sweetgreen | Restaurant chain | Online ordering (prepaid), menu, locations, opening hours, app/rewards |
| 6 | Tartine Bakery | Bakery / café | Menu, hours, locations, photos, ordering |
| 7 | Ace Hotel | Hotel | Book-now with date picker, room types with prices, gallery, dining, location |
| 8 | Kuriftu Resort & Spa | Resort | Rooms, amenities, gallery, booking, spa services, location |
| 9 | Drybar | Salon | Service menu with prices and duration, book a time, locations, FAQ |
| 10 | One Medical | Clinic | Services, book an appointment, locations, FAQ |
| 11 | IDEO | Agency | Case studies, team, services, contact |
| 12 | A law firm (practice-area site) | Professional services | Practice areas, team bios, case results, consultation request |
| 13 | Coursera | Education | Course catalogue with search and filters, programmes, enrolment |
| 14 | DHL Express | Logistics | Tracking, services, rates, delivery zones, locations |
| 15 | GOV.UK service page | Government | Service list, "Start now", step-by-step process, eligibility, contact, opening hours |
| 16 | A local events venue | Events | Event schedule with dates and tickets, gallery, contact |

## 3. Capability matrix

| Function on real sites | Seen on | Our builder | Status |
|---|---|---|---|
| Hero with name, one line, call to action, brand colours | all | `hero` | Supported |
| Product grid with prices and a working Order button | 1–4 | `items` (linked to real products), catalogue sections | Supported |
| Menu by category with prices and ordering | 5, 6 | `menu` | Supported |
| Services with prices and a request/order button | 9–12 | `services`, `pricing` | Supported |
| Room types, date availability and booking without double-booking | 7, 8 | `rooms` + BookingSheet | Supported |
| Book a time for a service (appointments, time slots) | 3, 9, 10 | `booking` sends a request; no time-slot calendar | **Partly** |
| Gallery of the business's own photos | 1, 5–9 | `gallery` | Supported |
| Video | 8, 11 | `video` (YouTube, privacy-enhanced) | Supported |
| Map, address, directions | 3, 5–10, 14, 15 | `map`, `contact` | Supported |
| Opening hours with "open now" | 5, 6, 9, 15 | `hours` | Supported |
| FAQ | 2, 9, 10, 15 | `faq` | Supported |
| Team / people | 9, 11, 12 | `team` | Supported |
| Step-by-step process ("how to apply") | 15 | `process` | Supported |
| Case studies, portfolio, before/after | 11, 12, 9 | `caseStudies`, `portfolio`, `before_after` | Supported |
| Delivery zones and fees | 2, 14 | `delivery` | Supported |
| Offer with an end date | 4, 5 | `offer` | Supported |
| Newsletter sign-up | 4, 6 | `newsletter` (owner sees sign-ups) | Supported |
| Phone, email, WhatsApp, social links | all | `contact`, `social` | Supported |
| Events with dates and tickets | 16 | `event_schedule` | Supported |
| Certifications, awards, partners, job openings | 10–12 | `certifications`, `awards`, `partners`, `job_openings` | Supported |
| Customer reviews and ratings | 1–4, 7–9 | **Platform reviews block on every site, verified customers only** | Supported (changed in this work) |
| Cart with several items, one checkout | 1–4 | One item per order (PurchaseModal) | **Partly** |
| Search and filters within the catalogue | 1–3, 13 | Catalogue sections have search and categories | Supported |
| Several pages (Shop, About, Policies) | all | One page per site, with anchors | **Partly** |
| Returns, privacy and terms pages for the business | 1–4 | None per site | **Missing** |
| Own domain name | all | `nodbusiness…/showroom/<address>` | **Missing** |
| Search-engine data (business type, rating) in the page | 1–9 | Title, description and share image only | **Partly** |
| Contact form (message without leaving the site) | 11, 12, 15 | WhatsApp, phone, email; chat inside the app | **Partly** |
| Site in several languages | 13–15 | One language per site | **Missing** |
| Order tracking | 14 | Order status page; live location (Pro) | Supported |

**Conclusion:** anyone can build a working single-page site at the level of the
reference sites for shops, restaurants, hotels, salons, professional services and
government offices, without code. All of these work end to end: ordering, room
booking with dates, menus, hours, maps, FAQ, contact links, and verified reviews.
The remaining gaps (§6) matter mostly for large online shops (cart, policy pages,
own domain) and appointment-based services (time slots).

## 4. Real-stack results (92 / 92)

`shots/results.json` has every check. Summary per site:

| Site (modelled on) | Checks | Highlights |
|---|---|---|
| Shop (Allbirds, Bellroy) | 14 / 14 | Buy Now opens the order dialog; delivery zones; FAQ opens; tel/mailto/wa.me links valid; no sideways scroll at 375 px; axe clean |
| Restaurant (Sweetgreen, Tartine) | 14 / 14 | Menu orders; opening hours; offer; map embeds; axe clean |
| Hotel (Ace Hotel, Kuriftu) | 16 / 16 | Room type listed; Check availability opens the booking sheet with dates; video and map embed |
| Salon (Drybar) | 14 / 14 | Services order; packages; team; booking call to action |
| Government office (GOV.UK) | 13 / 13 | Services; how-to-apply steps; office hours; map |
| Reviews and visitor welcome | 8 / 8 | No order → told why; completed order → rates from the site, review listed as "Verified customer", header shows ★ 5.0; signed-out → "Sign in to leave a review"; welcome modal buttons readable |
| Studio | 13 / 13 | Template → Publish → exactly one site (no duplicate); readable address kept on edit; Unpublish hides it from visitors; Publish again; Delete after confirmation; unfilled sections not shown to visitors; Studio axe clean |

## 5. Defects found and fixed in this change

| # | Severity | Defect | Fix |
|---|---|---|---|
| 1 | High (security) | Create/update wrote **any column** from the request body (`view_count`, `spotlight_*`, `expires_at`…) | Field allowlist (`backend/lib/showroomInput.ts`) |
| 2 | High (security) | No server check of links and images in sections: `javascript:`/`data:` URLs were stored and rendered as `href`/`src` | Every string in a section is checked; a 400 names the field |
| 3 | Medium | No length limits on name, description or sections (only the 2 MB body cap) | Name 120, description 1000, 40 sections, 64 KB each, 512 KB total, 5000 per text |
| 4 | High (trust) | Owners could type their own customer quotes, each shown with 5 stars; templates and seeds contained invented reviews and a "4.8 Customer rating" | Section retired, data migrated (`migrate91.js`); platform reviews on every site (§7) |
| 5 | High | Editing a live site in Studio **changed its address**, breaking shared links and QR codes; non-Latin names produced an empty address | The server makes the address once and keeps it; a taken address is a 409, not a 500 |
| 6 | Medium | Publishing a saved draft created a **second website** next to the draft | Publish updates the draft; an expired draft starts a new one |
| 7 | Medium | No way to **unpublish**; delete only on the Showrooms list | Owner actions on the site page: Edit, Unpublish, Publish again, Copy link, Delete with confirmation |
| 8 | Medium (trust) | A template published without filling it showed **empty blocks**, and an empty gallery showed **random stock photos** as if they were the business's | Unfilled sections are hidden from visitors (owner sees a prompt); gallery uses only the business's photos |
| 9 | Medium (trust) | Studio pre-filled **opening hours "Mon–Sat 9AM–6PM"** the owner never chose; samples had made-up phone, email and address | No default hours; publishing is blocked while sample contact details remain, naming the fields |
| 10 | Medium (a11y) | **Try Demo** button invisible (white on white) in the visitor welcome modal and site header | Light-background style on light surfaces |
| 11 | Medium (a11y) | WhatsApp buttons white on #25d366 (2.0:1), photo captions and the Studio address bar below 4.5:1 | WhatsApp #127a45 (5.4:1); caption strip 75 % black; slate grey text |
| 12 | Low | Owner's own visits counted as views | Not counted |
| 13 | Low | Studio never sent the theme colour or a share image, so links shared without a picture | Colour and cover image are sent from Studio |
| 14 | Low | Moving a section could swap the wrong one when an old draft held an unknown key | Moves skip keys the panel does not show |

## 6. Gaps against real websites (not built; for the owner to prioritise)

| Priority | Gap | Why it matters | Suggested approach |
|---|---|---|---|
| P1 | Template samples are the same for every category (a hotel sample has no rooms, a restaurant sample no menu) | First impression of Studio; owners start from the wrong sections | Category-specific samples built from `CATEGORY_DEFAULT_SECTIONS` |
| P1 | Appointment booking with time slots (salons, clinics) | Rooms have a calendar; services only send a request | Reuse the room-availability model for service time slots |
| P1 | Cart with several items | Real shops sell baskets, not one item at a time | Multi-item order on the existing direct-payment flow |
| P2 | Returns, privacy and terms pages per business | Expected and often legally required for online selling | A "Policies" section with standard, editable text |
| P2 | Search-engine data (LocalBusiness, aggregateRating) | Rich results in Google | JSON-LD from the business profile and verified reviews |
| P2 | Contact form | Visitors without WhatsApp | Form that sends an in-app message to the owner |
| P2 | Own domain name | Brand trust for larger businesses | Custom-domain mapping on the hosting side |
| P3 | Several pages per site | Large catalogues and long content | Optional pages built from the same sections |
| P3 | Site in several languages | Tourism, government | Per-section translations |

## 7. Reviews are platform-owned and mandatory

- **Builder:** "What customers say" (`testimonials`) is removed from the
  catalogue, every category default, every template and sample, the spotlight,
  the external-source mapper, the doctor's recommendations and the seeds. A guard
  test (`test/showroom/platformReviewsOnly.test.ts`) fails if a testimonials
  section or an invented rating ("4.8 rating", "★ 4.9", "120 reviews") returns.
- **Saved data:** `migrate91.js` removes testimonials sections and rating
  claims from `showrooms.sections`, `businesses.business_sections` and
  `user_profiles.business_sections`. It is idempotent, and a second run changes
  nothing. Old payloads that still contain the key are accepted, and the key is
  dropped, so no site breaks.
- **Every published site** (`ShowroomView`) and business profile shows the
  *Customer reviews* block. Owners cannot add, edit, hide or remove it. It shows:
  - the average and count, also in the site header
  - each review with a **Verified customer** badge
  - "No reviews yet" when empty
  - the rating form for a customer with a completed order
  - a clear reason for everyone else: the owner, no completed order, or signed out
- **A site cannot go live without a Business profile**, because its reviews belong
  to the business. This is checked in the DB tests.

## 8. Sources

- Allbirds: [Shopify store breakdown](https://craftshift.com/allbirds-shopify-store-breakdown/), [Landing Doctor teardown](https://landingdoctors.com/teardowns/allbirds-com), [design breakdown](https://xgentech.net/blogs/resources/shopify-store-design-breakdown-dissecting-the-store-design-of-allbirds/)
- Sweetgreen: [UX teardown](https://fueled.com/blog/sweetgreen/), [app redesign](https://chainstoreage.com/sweetgreen-redesigns-app-enhanced-ordering-loyalty)
- Hotels: [SiteMinder hotel website features](https://www.siteminder.com/r/marketing/hotel-website-design/features-hotel-website-editor), [Elementor hotel website guide](https://elementor.com/blog/how-to-create-a-hotel-website/)
- Salons: [Fresha salon price list](https://www.fresha.com/blog/salon-price-list), [Drybar services (WeddingWire)](https://www.weddingwire.com/biz/drybar/7889dbe5281976b5.html)
- Warby Parker: [Ways to try](https://www.warbyparker.com/ways-to-try)
- GOV.UK: [Start using a service pattern](https://design-system.service.gov.uk/patterns/start-using-a-service)
- Professional services: [Elementor professional services examples](https://elementor.com/blog/professional-services-website-examples/)
- Coursera: [front page redesign](https://blog.coursera.org/our-new-front-page-so-fresh-and-so-clean)
- Small-business essentials: [GoDaddy homepage elements](https://www.godaddy.com/resources/skills/10-elements-of-an-effective-small-business-website-homepage)
- Restaurant templates: [Website Planet Squarespace restaurant templates](https://websiteplanet.com/blog/best-squarespace-restaurant-templates)
- Fake reviews: [FTC final rule banning fake reviews and testimonials (2024)](https://www.ftc.gov/news-events/news/press-releases/2024/08/federal-trade-commission-announces-final-rule-banning-fake-reviews-testimonials)

## 9. Re-running

```bash
bash note/2026-11-05-international-audit/scripts/local-stack.sh up
```

```bash
cd frontend-next && source ~/.nodbusiness-local/env.sh && node ../note/2026-11-14-showroom-audit/audit-run.mjs /tmp/showroom-audit
```

The script refuses a non-local database, creates its own throw-away accounts and
removes them when it finishes. It prints a JSON summary and exits non-zero if any
check fails.
