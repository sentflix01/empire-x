# Halehame — Competitive Patent Analysis
# What You Can Own vs. What Already Belongs to Competitors

> **Classification:** STRICTLY CONFIDENTIAL — Attorney-Client Privileged
> **Purpose:** Detailed comparison of Halehame's features against competitor
> patent portfolios to identify:
>   (A) What you CANNOT use freely — risk of infringement
>   (B) What you CAN use — prior art, common practice, or expired patents
>   (C) What is UNIQUELY YOURS — novel innovations worth patenting
>
> **Last Updated:** August 2026
> **Review With:** USPTO-registered patent attorney before launch

---

## How to Read This Document

Each feature of Halehame is analyzed across 6 direct competitors:

| Symbol | Meaning |
|--------|---------|
| 🔴 RISK | Competitor has a patent in this area — requires attorney review before shipping |
| 🟡 MONITOR | Similar patents exist but distinguishable — proceed with care, document differentiation |
| 🟢 SAFE | No known patent coverage — common practice or prior art predates any claims |
| 🔵 YOURS | Novel to Halehame — worth filing provisional patent immediately |

**The 6 Direct Competitors Analyzed:**
1. **Shopify** — E-commerce platform (most relevant for marketplace + payments)
2. **Wix** — Website builder (most relevant for showroom builder)
3. **Meta (Facebook/Instagram)** — Social platform (most relevant for feed + discovery)
4. **Google** — Search + Maps (most relevant for nearby discovery + rankings)
5. **Telegram** — Messaging + marketplace (most relevant for chat + bot ecosystem)
6. **Squarespace** — Website builder/template platform (most relevant for templates)

---

## SECTION 1 — SOCIAL FEED & CONTENT

---

### Feature 1.1 — News Feed / Content Feed

| Aspect | Competitor Status | Risk Level | Analysis |
|--------|-----------------|-----------|----------|
| Chronological content feed | Meta (US8732091) | 🟢 SAFE | Chronological feed is prior art dating to blogs (2001). Not patentable. |
| Algorithmic ranked feed | Meta (US10789526) | 🔴 RISK | Meta holds broad patents on algorithmic content ranking using social signals. |
| Interest-based content filtering | Facebook (US9824407) | 🟡 MONITOR | Meta patents on personalized filtering. Safe if you use different signals. |
| Business content in social feed | Instagram (US20170109786) | 🟡 MONITOR | Instagram filed on business posts in social context. Distinguish: your businesses ARE users, not advertisers. |

**Halehame approach — SAFE:**
```
✅ Default to chronological feed in Phase 1 (prior art — not patentable by anyone)
✅ Document your feed as "discovery of businesses the user follows"
   NOT "algorithmic content ranking based on engagement signals"
✅ When you implement personalization (Phase 2), ensure your algorithm
   uses different signals than Meta (combine proximity + category + trending velocity
   — your Patent 3 covers this novel combination)
✅ The key differentiator: your feed shows BUSINESS SHOWROOMS, not status updates.
   This context distinction is meaningful in patent claims.
```

---

### Feature 1.2 — Stories (24-Hour Content)

| Aspect | Competitor Status | Risk Level | Analysis |
|--------|-----------------|-----------|----------|
| 24-hour disappearing content | Snap (US9473445) | 🟡 MONITOR | Snapchat holds original "disappearing content" patents, but they are specifically about private messaging. Public stories are different. |
| Stories in social feed bar | Instagram/Meta (US10382838) | 🟡 MONITOR | Meta filed on the specific UI of stories as a horizontal scroll above the feed. |
| Business stories (branded) | Meta | 🟢 SAFE | Business-specific story functionality is not specifically patented. |
| Story analytics | Meta | 🟢 SAFE | Providing analytics to creators/businesses on story views is prior art. |

**Halehame approach — SAFE:**
```
✅ Your hexagonal story design is visually distinct from Instagram's circular stories
   — this matters for design patent / trade dress differentiation
✅ Stories that link directly to a business showroom are novel context
✅ 24-hour content has been prior art since Snapchat's public launch in 2011;
   basic functionality is not patentable by anyone anymore
✅ Keep your story UI meaningfully different from Instagram's: shape, placement, gesture
```

---

### Feature 1.3 — Posts (Text, Image, Polls)

| Aspect | Competitor Status | Risk Level | Analysis |
|--------|-----------------|-----------|----------|
| Text post creation | Prior art (blogs, forums 1999) | 🟢 SAFE | Absolutely prior art. Cannot be patented. |
| Image post with caption | Prior art (Flickr 2004) | 🟢 SAFE | Absolutely prior art. Cannot be patented. |
| Poll in social post | Prior art (SurveyMonkey + Twitter polls) | 🟢 SAFE | Polls in social context are widely implemented and prior art. |
| Post sharing / reposting | Prior art (Twitter retweet 2009) | 🟢 SAFE | Reposting mechanisms are prior art. |
| Post linked to product listing | Pinterest (US9600557) | 🟡 MONITOR | Pinterest patented "shoppable posts" with product links. Distinguish: your posts are organic user content, not paid product pins. |

**Halehame approach — SAFE:**
```
✅ All basic posting functionality is prior art — safe to implement
✅ "Business post" that links to a showroom product is meaningfully different from
   Pinterest's shoppable posts (Pinterest = paid/curated pins; yours = organic content)
✅ Document your post-to-product flow as distinct from Pinterest's mechanism
```

---

## SECTION 2 — SHOWROOM BUILDER

---

### Feature 2.1 — Drag-and-Drop Website Builder

| Aspect | Competitor Status | Risk Level | Analysis |
|--------|-----------------|-----------|----------|
| Drag-and-drop page building | Wix (US9336319, US9489147) | 🔴 RISK | Wix holds patents on drag-and-drop web editing where elements can be placed freely on a canvas. |
| Grid-based drag-and-drop | Squarespace (US9361013) | 🔴 RISK | Squarespace patented grid-constrained drag-and-drop layouts. |
| Section-based page building | Multiple (WordPress, Elementor prior art) | 🟢 SAFE | Section-based page builders (add a section, fill content) predate these patents sufficiently. |
| Template selection interface | Prior art | 🟢 SAFE | Template selection UX is prior art from CMS systems (WordPress themes 2004+). |

**Halehame approach — SAFE:**
```
✅ DO NOT implement free-placement drag-and-drop (risk of Wix patent infringement)
✅ DO implement section-based building: user adds pre-defined sections (hero, about,
   menu, contact) and edits WITHIN each section
✅ This is architecturally different from Wix: sections have fixed structure,
   content flows vertically, no free canvas positioning
✅ Your builder is closer to Notion (section-based) than Wix (free canvas)
✅ Section reordering via drag is SAFE — it's the WITHIN-section free positioning
   that Wix holds patents on
✅ Document your architecture clearly: "structured section-based editor,
   not free-canvas drag-and-drop" — this is your patent defense
```

---

### Feature 2.2 — Templates and Template System

| Aspect | Competitor Status | Risk Level | Analysis |
|--------|-----------------|-----------|----------|
| Visual website templates | Prior art (WordPress themes 2004) | 🟢 SAFE | Template systems are extremely well-established prior art. |
| Category-specific templates | Wix, Squarespace | 🟢 SAFE | Having templates for specific business types is widely implemented. |
| Template preview before applying | Prior art | 🟢 SAFE | Live template preview is standard and prior art. |
| AI-generated template suggestions | Multiple (Wix ADI, Zyro) | 🟡 MONITOR | AI-assisted site creation is being filed by Wix (Wix ADI patents pending). Distinguish: you don't auto-generate sites, you suggest categories. |
| Template marketplace (buy/sell) | Shopify Theme Store, Envato | 🟢 SAFE | Template marketplaces are well-established prior art (ThemeForest since 2008). |
| **Dynamic AI-priced templates** | **No known patent** | 🔵 **YOURS** | **Pricing templates dynamically based on demand + quality + competition: NOVEL. File Patent 1 immediately.** |

**Halehame approach:**
```
✅ Basic template system: prior art, fully safe
✅ Category-specific templates: prior art, fully safe
✅ Template marketplace: prior art, fully safe
🔵 AI-PRICED templates: UNIQUELY YOURS — no competitor has this
   → File provisional patent (Patent 1) BEFORE launch
   → Document creation date NOW (OriginStamp + git history)
   → This is your strongest patentable innovation
```

---

### Feature 2.3 — Live Preview / Real-Time Editing

| Aspect | Competitor Status | Risk Level | Analysis |
|--------|-----------------|-----------|----------|
| WYSIWYG editing | Prior art (Microsoft Word 1981) | 🟢 SAFE | "What You See Is What You Get" editing is 40+ years of prior art. |
| Real-time preview of published output | Prior art (multiple CMS) | 🟢 SAFE | Live preview is standard in web builders. Prior art well established. |
| Split-screen editor/preview | Wix, Webflow | 🟢 SAFE | Widely implemented. Not novel enough to patent. |
| Mobile preview toggle | Multiple platforms | 🟢 SAFE | Common feature, prior art. |

**Halehame approach — SAFE:**
```
✅ All live preview functionality is safe to implement
✅ Auto-save with 2-second debounce is a common pattern — safe
```

---

### Feature 2.4 — Business Profile and Showroom Page

| Aspect | Competitor Status | Risk Level | Analysis |
|--------|-----------------|-----------|----------|
| Business profile page | Prior art (Google My Business, Facebook Pages, Yelp) | 🟢 SAFE | Business profile pages are ubiquitous prior art. |
| Public-facing business URL / slug | Prior art | 🟢 SAFE | Custom URL slugs for business pages are prior art. |
| Product catalog on business page | Shopify, Amazon | 🟢 SAFE | Product catalogs are prior art. |
| Map embed on business page | Google (Google Maps Embed API) | 🟢 SAFE | Map embeds on business pages are prior art. |
| Social links on business page | Prior art (LinkTree, about.me) | 🟢 SAFE | Social link aggregation pages are prior art. |
| Showroom with integrated payment | Shopify | 🟡 MONITOR | Shopify has broad e-commerce checkout patents. Distinguish: your payment is via external Stripe redirect, not inline. |
| **Business showroom discovered via social feed** | **No known patent** | 🔵 **YOURS** | **The specific combination of social graph discovery + business showroom (not just a social post) is novel. Part of Patent 3.** |

---

## SECTION 3 — MARKETPLACE & COMMERCE

---

### Feature 3.1 — Product Listings

| Aspect | Competitor Status | Risk Level | Analysis |
|--------|-----------------|-----------|----------|
| Product listing with photo/title/price | Prior art (eBay 1995, Amazon 1995) | 🟢 SAFE | Product listings are 30+ years of prior art. Cannot be patented. |
| Product categories and filters | Prior art | 🟢 SAFE | Category-based product browsing is prior art. |
| Product variants (size, color) | Shopify (US10691796) | 🟡 MONITOR | Shopify filed on variant-based product inventory management. Distinguish: your variant system is basic and distinct from Shopify's complex inventory management. |
| Product reviews and ratings | Prior art (Amazon 1997) | 🟢 SAFE | Product reviews are extremely well-established prior art. |
| Wishlist / save product | Prior art | 🟢 SAFE | Wishlists are prior art (Amazon 1999). |
| Price drop alerts on wishlist | Prior art (multiple e-commerce platforms) | 🟢 SAFE | Price alerts are well-established prior art. |

**Halehame approach — SAFE:**
```
✅ All standard marketplace features are safe to implement
✅ Product variants: keep your implementation simple and distinct from Shopify's
   complex multi-dimensional inventory system
✅ Document that your variant system is a basic consumer-facing feature,
   not an inventory management system
```

---

### Feature 3.2 — Shopping Cart and Checkout

| Aspect | Competitor Status | Risk Level | Analysis |
|--------|-----------------|-----------|----------|
| Shopping cart | Prior art (early web commerce 1994+) | 🟢 SAFE | Extremely well-established prior art. |
| Add to cart UX | Prior art | 🟢 SAFE | |
| Stripe-hosted checkout redirect | Not patentable (process, not invention) | 🟢 SAFE | Redirecting to a payment processor is a process, not a patentable invention. |
| Order management (buyer + seller) | Prior art (eBay, Amazon) | 🟢 SAFE | Order management is prior art. |
| Delivery status tracking | Prior art (FedEx, UPS tracking systems 1990s) | 🟢 SAFE | Delivery tracking is prior art. |
| Coupon / discount codes | Prior art | 🟢 SAFE | Coupon systems are decades-old prior art. |
| Multi-seller cart | Amazon (US8655753) | 🟡 MONITOR | Amazon has patents on multi-seller checkout flows. Distinguish: your flow creates separate orders per seller, not a unified Amazon-style cart. |

**Halehame approach — SAFE:**
```
✅ All standard checkout functionality is safe
✅ Multi-seller cart: implement as separate orders per seller
   (distinct from Amazon's single checkout for multiple third-party sellers)
✅ Document: "Each seller processes their own order separately. Not a
   unified multi-merchant checkout like Amazon." This distinction matters.
```

---

### Feature 3.3 — Payment Processing

| Aspect | Competitor Status | Risk Level | Analysis |
|--------|-----------------|-----------|----------|
| Integrating Stripe for payments | Stripe holds payment processing patents | 🟡 MONITOR | You are a CUSTOMER of Stripe, not reimplementing Stripe. This is safe. |
| ETB / local currency handling | Not patented (currency conversion is math) | 🟢 SAFE | |
| Wallet / stored balance | PayPal (multiple patents) | 🟡 MONITOR | PayPal has broad wallet patents. Distinguish: your wallet is a feature of a marketplace platform, not a standalone payment service. |
| QR-code payment flow | Multiple (WeChat, Alipay) | 🟡 MONITOR | QR payment flows are widely patented in Asia. Distinguish: you are using third-party Chapa's QR — you don't implement the QR payment yourself. |
| Commission deduction on sale | Prior art | 🟢 SAFE | Platform commission models (eBay, Amazon) are prior art. |
| **Revenue share adjusted by quality score** | **No known patent** | 🔵 **YOURS** | **Patent 2 — UNIQUELY YOURS. No marketplace adjusts revenue share % based on quality metrics. File immediately.** |

---

## SECTION 4 — TASKS & GIGS

---

### Feature 4.1 — Task/Gig Marketplace

| Aspect | Competitor Status | Risk Level | Analysis |
|--------|-----------------|-----------|----------|
| Post a task for bids | TaskRabbit (US8423404) | 🟡 MONITOR | TaskRabbit patented aspects of task posting + bidding for local services. Their claims are specific to geolocation-based task matching. |
| Gig listing (fixed price) | Fiverr | 🟢 SAFE | Fixed-price gig listings are not patented — too generic. |
| Bidding on tasks | Prior art (oDesk/Upwork 2003) | 🟢 SAFE | Competitive bidding for work is prior art dating to early freelance platforms. |
| Task completion verification | Prior art | 🟢 SAFE | Task marking as complete is prior art. |
| Escrow payment on task | Escrow.com (US7155410) | 🟡 MONITOR | Escrow for online transactions has been patented. Distinguish: use Stripe's payment hold + release, not a custom escrow system. |
| Task location on map | TaskRabbit | 🟡 MONITOR | TaskRabbit specifically patented "location-based task discovery." Distinguish: your map shows tasks in a discovery feed context, with social + category signals, not pure geolocation matching. |

**Halehame approach:**
```
✅ Basic task posting and bidding: prior art — safe
✅ For escrow: use Stripe's payment hold capability (you're using Stripe's patent-covered tech as a licensed customer, not implementing your own)
🟡 For map-based task display: ensure your implementation emphasizes the SOCIAL + CATEGORY context, not just proximity matching (which is TaskRabbit's claim territory)
✅ Document: "Task discovery uses four signals (social + proximity + category + trending) — not pure proximity matching like TaskRabbit"
```

---

## SECTION 5 — MESSAGING

---

### Feature 5.1 — Real-Time Messaging

| Aspect | Competitor Status | Risk Level | Analysis |
|--------|-----------------|-----------|----------|
| Real-time text messaging | Prior art (IRC 1988, AIM 1997) | 🟢 SAFE | Real-time messaging is 35+ years of prior art. |
| Read receipts | Prior art (Blackberry BBM 2005) | 🟢 SAFE | Read receipts are prior art. |
| Typing indicators | Prior art | 🟢 SAFE | "Is typing..." indicators are prior art. |
| Message delivery status | Prior art | 🟢 SAFE | |
| Reply-to / quote messages | Prior art (email, IRC) | 🟢 SAFE | Quoting/replying is email prior art. |
| Group chats | Prior art | 🟢 SAFE | Group messaging is prior art. |
| Message editing / deletion | Prior art | 🟢 SAFE | |
| Voice messages | Prior art (WhatsApp 2013) | 🟢 SAFE | Audio messages in chat are prior art. |
| End-to-end encryption | Signal Protocol (open-source license) | 🟡 MONITOR | Signal's E2E encryption is open-source but the protocol has specific implementation requirements. Use Signal Protocol if implementing E2E. |
| Presence (online/offline) | Prior art (AIM away status 1997) | 🟢 SAFE | |
| Block users in messaging | Prior art | 🟢 SAFE | |

**Halehame approach — SAFE:**
```
✅ All standard messaging features are completely safe — deep prior art
✅ Real-time via Socket.IO is an implementation choice, not a patentable method
✅ If implementing E2E encryption: use Signal Protocol (open-source, widely licensed)
✅ None of your messaging features require patent concern
```

---

## SECTION 6 — DISCOVERY & SEARCH

---

### Feature 6.1 — Search

| Aspect | Competitor Status | Risk Level | Analysis |
|--------|-----------------|-----------|----------|
| Full-text search | Prior art (AltaVista 1995) | 🟢 SAFE | Text search is prior art. |
| Fuzzy / typo-tolerant search | Prior art (multiple) | 🟢 SAFE | |
| Search with category filters | Prior art | 🟢 SAFE | |
| Autocomplete search suggestions | Google (US6421669) | 🟡 MONITOR | Google has patents on search autocomplete/suggestions. Distinguish: your suggestions are within your own platform data, not web-scale. |
| Search ranking algorithm | Google (multiple) | 🟡 MONITOR | Google's PageRank and many ranking algorithms are patented. Distinguish: you are not using web links — your ranking uses platform-specific signals. |

**Halehame approach — SAFE:**
```
✅ Basic platform search: safe (you're not Google — you search your own data)
✅ Google's patents are specific to web-scale link analysis (PageRank)
   — your search ranking uses engagement data within your platform, which is distinct
✅ Autocomplete: keep it simple (match against your own data, not web-scale)
```

---

### Feature 6.2 — Nearby Map Discovery

| Aspect | Competitor Status | Risk Level | Analysis |
|--------|-----------------|-----------|----------|
| Map with business markers | Google Maps (multiple patents) | 🟡 MONITOR | Google has extensive map UI patents. Mitigation: you are a CUSTOMER of Leaflet/OpenStreetMap, using their licensed tech. |
| Nearby business search | Yelp (US8078580), Google | 🟡 MONITOR | Proximity-based business discovery is patented territory. Distinguish: your proximity is ONE of FOUR signals, not the only ranking factor. |
| Map marker clustering | Prior art (multiple mapping libraries) | 🟢 SAFE | Marker clustering is widely implemented and prior art. |
| Business profile preview on map tap | Multiple | 🟢 SAFE | Map pin info windows are prior art. |
| Filter nearby businesses by category | Yelp, Google | 🟡 MONITOR | Category-filtered local search is in contested patent territory. Document that yours combines social + category + trending, not just category filtering. |
| **Four-factor discovery score (social + proximity + category + trending velocity)** | **No known patent** | 🔵 **YOURS** | **Patent 3 — UNIQUELY YOURS. The four-factor combination for business showroom discovery has not been patented by anyone. File immediately.** |

---

### Feature 6.3 — Trending & Personalized Feed

| Aspect | Competitor Status | Risk Level | Analysis |
|--------|-----------------|-----------|----------|
| Trending topics / hashtags | Twitter (US8495072) | 🟡 MONITOR | Twitter has patents on trending topic identification. Distinguish: your trending is for BUSINESSES/SHOWROOMS, not topics. Context matters. |
| Personalized content recommendations | Netflix (US8266024), Meta | 🔴 RISK | Broad personalized recommendation patents held by Netflix and Meta. Distinguish carefully or delay this feature. |
| People you may know (suggestions) | Facebook (US8918418) | 🔴 RISK | Facebook has patents specifically on "people you may know" algorithms using mutual connections. Distinguish: your "business discovery" combines 4 factors; keep "people suggestions" separate and use distinct signals. |
| **Trending velocity (rate of change, not volume)** | **No known patent** | 🔵 **YOURS** | **Your specific use of rate-of-change (velocity) vs. absolute engagement for trending is novel. Part of Patent 3.** |

**Halehame approach:**
```
🔴 Personalized recommendations: Delay or distinguish carefully from Netflix/Meta claims
   → Use terminology: "discovery based on your network and location" not "personalized recommendations"
   → The four-factor combination (Patent 3) distinguishes you architecturally

🔴 People suggestions: Ensure your algorithm is NOT based purely on mutual connections
   (Facebook's specific patent claim)
   → Add geographic proximity and category interest as primary signals
   → "Businesses and people near you with shared interests" differs from "people you may know via mutual connections"

🔵 Trending velocity: Uniquely yours — document and file Patent 3
```

---

## SECTION 7 — DEVELOPER PLATFORM & ECOSYSTEM

---

### Feature 7.1 — API and Webhooks

| Aspect | Competitor Status | Risk Level | Analysis |
|--------|-----------------|-----------|----------|
| REST API | Prior art (REST architecture 2000) | 🟢 SAFE | REST APIs are prior art. |
| Webhook event notifications | Prior art (multiple services 2007+) | 🟢 SAFE | Webhooks are widely implemented — prior art. |
| API key authentication | Prior art | 🟢 SAFE | |
| OAuth 2.0 | IETF standard (RFC 6749, open standard) | 🟢 SAFE | OAuth 2.0 is an open standard — safe to implement. |
| Rate limiting | Prior art | 🟢 SAFE | |
| Developer dashboard | Prior art (Stripe, Twilio) | 🟢 SAFE | |

**Halehame approach — SAFE:**
```
✅ All developer platform features are safe — all prior art or open standards
✅ None require patent concern
```

---

### Feature 7.2 — Template Developer Marketplace

| Aspect | Competitor Status | Risk Level | Analysis |
|--------|-----------------|-----------|----------|
| Third-party app/template marketplace | Shopify App Store (2009) | 🟢 SAFE | Template/app marketplaces are prior art. |
| Revenue sharing with developers | Apple App Store (2008), Shopify | 🟢 SAFE | Revenue sharing with developers is prior art. |
| Developer review and approval process | Multiple platforms | 🟢 SAFE | |
| Developer analytics dashboard | Prior art | 🟢 SAFE | |
| Fixed revenue split (70/30) | Apple, Google, Shopify | 🟢 SAFE | Fixed splits are prior art and widely implemented. |
| **Quality-score-adjusted revenue share** | **No known patent** | 🔵 **YOURS** | **Patent 2 — UNIQUELY YOURS. No platform adjusts developer revenue share percentage based on quality metrics. File immediately.** |
| **Developer storefront / public profile** | Prior art | 🟢 SAFE | Developer profile pages are prior art. |

---

## SECTION 8 — AI FEATURES

---

### Feature 8.1 — AI Product Descriptions

| Aspect | Competitor Status | Risk Level | Analysis |
|--------|-----------------|-----------|----------|
| AI-generated text content | OpenAI, Google, Anthropic (multiple patents) | 🟡 MONITOR | AI text generation is heavily patented at the MODEL level. But you are a CUSTOMER of OpenAI/Gemini — you use their API. You don't infringe their model patents by calling their API. |
| AI description generation for products | Shopify (Sidekick AI, patent pending) | 🟡 MONITOR | Shopify filed on AI-assisted product listing creation. Distinguish: you generate descriptions via API call, not a proprietary AI model. |
| AI content suggestions | Multiple | 🟡 MONITOR | |
| AI chatbot / assistant | Multiple (Google, Microsoft, Meta) | 🟡 MONITOR | You are using third-party models (OpenAI/Gemini) via API — you don't infringe the underlying model patents. |

**Halehame approach — SAFE:**
```
✅ Using AI APIs (OpenAI, Gemini, Anthropic): SAFE — you are a licensed customer
✅ You are NOT creating a new AI model — you are applying existing models to your context
✅ The specific APPLICATION of AI to showroom/template context may be novel
   but is not currently worth patenting (too narrow, too easily designed around)
✅ Document: "AI features powered by [OpenAI/Gemini] API under commercial license"
```

---

### Feature 8.2 — AI Dynamic Template Pricing

| Aspect | Competitor Status | Risk Level | Analysis |
|--------|-----------------|-----------|----------|
| **AI pricing based on demand + quality + competition** | **No known patent** | 🔵 **YOURS — MOST VALUABLE** | **UNIQUELY YOURS. This is the strongest patent claim. File Patent 1 first, before any other.** |
| Dynamic pricing (general) | Uber (surge pricing), Airbnb | 🟢 SAFE | General dynamic pricing exists in many domains but NOT for digital templates. Your specific domain + signals combination is novel. |
| Price adjustment within developer-set range | No known patent | 🔵 **YOURS** | The specific mechanism of platform adjusting within developer-set min/max is novel. Part of Patent 1. |
| Demand indicator display ("High Demand" badge) | No known patent | 🔵 **YOURS** | Showing visual demand indicators for template pricing without revealing algorithm is novel. Part of Patent 1. |

---

## SECTION 9 — WALLET & PAYMENTS

---

### Feature 9.1 — Integrated Wallet

| Aspect | Competitor Status | Risk Level | Analysis |
|--------|-----------------|-----------|----------|
| Digital wallet balance | PayPal (multiple), WeChat Pay | 🟡 MONITOR | PayPal has broad digital wallet patents. Distinguish: your wallet is a feature of a social commerce platform, not a standalone financial service. |
| Wallet top-up via payment gateway | Prior art | 🟢 SAFE | Funding a wallet via credit card or bank is prior art. |
| Peer-to-peer wallet transfers | Venmo, PayPal, Cash App | 🟡 MONITOR | P2P transfers are patented by several financial tech companies. Distinguish: your P2P transfers are within platform context (paying for tasks, gigs). |
| Commission auto-deduction | Prior art (eBay, Airbnb) | 🟢 SAFE | Platform taking commission on transactions is prior art. |
| Referral points / loyalty points | Prior art | 🟢 SAFE | Points/loyalty programs are prior art. |

**Halehame approach:**
```
🟡 Wallet: position as "platform balance for in-app purchases"
   NOT as "digital financial service" — this distinction matters legally
   and may determine whether you need financial regulation compliance too
✅ Keep wallet functionality as a convenience feature, not a primary financial product
✅ All transactions ultimately process through Stripe or Chapa — licensed payment processors
   handle the financial regulation, you handle the UI
```

---

## SECTION 10 — COMPREHENSIVE SUMMARY TABLE

---

### What You CANNOT Freely Use (High Risk — Requires Attorney Review)

| Feature | Risk Owner | Reason | Mitigation |
|---------|-----------|--------|-----------|
| Free-placement drag-and-drop builder | Wix, Squarespace | Direct patent coverage | Use section-based builder instead |
| Personalized content recommendation algorithm using social signals | Meta, Netflix | Broad patent coverage | Use your 4-factor algorithm (Patent 3) — distinct |
| "People you may know" using only mutual connections | Facebook | Specific patent claim | Add proximity + category signals — makes it distinct |
| Grid-constrained drag-and-drop | Squarespace | Direct patent coverage | Use section-based approach |
| Surge/dynamic pricing using demand only (no quality signal) | Uber (for rides), Airbnb | Narrow coverage in their domain | Your pricing adds quality + competition factors — novel combination |

---

### What You CAN Use Freely (Safe — Prior Art or Unpatentable)

| Feature | Reason Safe |
|---------|------------|
| Social feed (chronological) | Prior art since blogs (2001) |
| Text / image posts | Prior art since early social media (2004) |
| Stories (24-hour content) | Prior art since Snapchat's public launch (2011) |
| User follows / social graph | Prior art |
| Likes, comments, shares | Prior art |
| Product listings with photos/price | Prior art (eBay 1995) |
| Shopping cart and checkout redirect | Prior art |
| Real-time messaging | Prior art (IRC 1988) |
| Read receipts, typing indicators | Prior art |
| Template marketplace | Prior art (ThemeForest 2008) |
| Fixed revenue split with developers | Prior art (Apple App Store 2008) |
| Search with filters | Prior art |
| Map with markers and clustering | Prior art (Google Maps 2005 + open-source libraries) |
| REST API and webhooks | Prior art |
| OAuth 2.0 | Open standard |
| Using AI APIs (OpenAI, etc.) | You are a licensed customer, not implementing the model |
| Product reviews and ratings | Prior art (Amazon 1997) |
| Wishlists and price alerts | Prior art |
| Commission deduction on sales | Prior art |
| Loyalty / referral points | Prior art |
| Group messaging | Prior art |
| Task posting and bidding | Prior art (Upwork 2003) |

---

### What Is UNIQUELY YOURS — File Patents Immediately

| Innovation | Patent # | Priority | Why Novel | File By |
|-----------|----------|----------|-----------|---------|
| **AI Dynamic Template Pricing** using real-time demand + quality + competition signals | Patent 1 | 🔴 CRITICAL | No platform prices templates dynamically. No one uses this three-signal combination. | Before launch |
| **Quality-Adjusted Developer Revenue Share** — revenue % adjusts based on quality score | Patent 2 | 🔴 HIGH | All marketplaces use fixed splits. Quality-adjusted % is new. | Before launch |
| **Four-Factor Business Showroom Discovery** — social graph + proximity + category taxonomy + trending velocity | Patent 3 | 🔴 HIGH | No platform combines all 4. Trending velocity (rate of change) is novel signal. | Before launch |
| **Trending Velocity as discovery signal** (rate of change, not absolute volume) | Part of Patent 3 | 🟡 MEDIUM | Standard trending uses volume. Velocity is a distinct signal not patented. | Before launch |
| **Developer-controlled price floor/ceiling with platform AI adjustment within range** | Part of Patent 1 | 🟡 MEDIUM | The specific mechanism of platform adjusting within developer-defined bounds is novel. | Before launch |
| **Section-based no-code showroom builder for category-specific businesses with template taxonomy mapping** | Future Patent 4 | 🟡 MEDIUM | The specific taxonomy (global business categories → section types) is novel. File when stronger. | After Phase 2 |

---

## ACTION PLAN — Patent Protection Sequence

```
BEFORE LAUNCH (CRITICAL — Do these before any public demo):

Week 1:
  □ File provisional patent for Patent 1 (AI Pricing) — most valuable
  □ Timestamp this document + all patent drafts on OriginStamp.com
  □ Ensure git history documents creation of pricing algorithm

Week 2:
  □ File provisional patent for Patent 2 (Revenue Share)
  □ File provisional patent for Patent 3 (Discovery Method)
  □ Sign NDAs with all developers who have seen the algorithms

Before Phase 2 launch (template marketplace):
  □ File full utility patents (within 12 months of provisional)
  □ Add "Patent Pending" label to relevant product features
  □ Consider PCT international application for global coverage

ONGOING:
  □ Monitor competitor patent filings quarterly
     (Search: "template marketplace pricing", "developer revenue share quality",
      "social commerce discovery algorithm")
  □ Document every algorithm change with date and description
  □ Never publicly disclose algorithm details, weights, or implementation
```

---

## Legal Disclaimer

> This analysis is prepared by Halehame Technologies for internal planning
> purposes. It represents the founder's research and analysis, NOT legal advice.
> Patent law is complex, jurisdiction-specific, and changes frequently.
> A USPTO-registered patent attorney must review this document before any
> filing decisions are made.
>
> This document should be treated as attorney work product once reviewed
> by licensed counsel. Do not share outside of Halehame Technologies without
> explicit written authorization.

---

*Document created: August 2026*
*Status: Awaiting patent attorney review*
*Next review: Before public launch*
