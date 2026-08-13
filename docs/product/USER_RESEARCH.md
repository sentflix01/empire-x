# Halehame — User Research & Personas

> Understanding who we're building for — their goals, frustrations, and how Halehame solves their problems.
> **Last updated:** August 2026

---

## Global User Context

Before personas, understand the environment:

| Fact | Implication |
|---|---|
| Mobile internet penetration: ~35% | Mobile-first, not desktop-first |
| Average connection speed: 5–15 Mbps 4G | Images must be optimized; avoid large JS bundles |
| Most-used platform: Telegram (60%+ of connected Ethiopians) | Compete with / integrate with Telegram behavior |
| WhatsApp penetration: ~40% | Business owners manage orders via WhatsApp |
| Facebook: ~20% (declining among youth) | Younger users are on TikTok / Instagram |
| Smartphone penetration: ~28% (growing fast) | PWA matters — must work on entry-level Android |
| Primary business communication: Phone call + Telegram | Order notifications via push + Telegram bot |
| Average transaction size: ETB 200–2,000 | Most commerce is micro/small business |
| Cash dominance: ~80% of transactions | COD must work; Chapa + Telebirr needed |
| Language: 80+ languages, but Amharic is lingua franca | Amharic + English sufficient for launch |

---

## Core Personas

### Persona 1: Tigist — The Micro-Entrepreneur

**Profile:**
- Age: 28 | Female | Addis Ababa, Bole sub-city
- Education: 12th grade + vocational training
- Occupation: Sells traditional clothing and accessories from home
- Tech: Samsung A-series Android, Telebirr, Telegram, WhatsApp
- Income: ETB 3,000–8,000/month

**Goals:**
- Reach more customers beyond her neighborhood
- Accept digital payment (not just cash)
- Show her products professionally without a physical shop
- Manage orders without constant WhatsApp back-and-forth

**Frustrations:**
- Has to manually reply to every WhatsApp inquiry
- Can't track which customers placed orders
- No professional way to show her catalog
- Banks are far away; getting paid is hard
- Has no formal business registration

**How Halehame helps:**
- Showroom Studio → professional online store in 30 minutes
- Marketplace listing → reach local and global customers
- Chapa checkout → accept Telebirr from customers
- Orders page → track every sale in one place
- No registration required to start selling

**Feature priorities for Tigist:** Showroom, Marketplace, Chapa payment, Orders, Chat (to answer customer questions)

---

### Persona 2: Yonas — The Employed Young Professional

**Profile:**
- Age: 24 | Male | Addis Ababa, Kazanchis
- Education: University graduate (Computer Science)
- Occupation: Junior software developer at a local company
- Tech: iPhone 13, TikTok, Instagram, LinkedIn, Telegram
- Income: ETB 15,000/month

**Goals:**
- Connect with other young professionals
- Find freelance side projects (tasks/jobs)
- Buy and sell second-hand items
- Stay updated on Ethiopian tech and business news
- Build a professional presence online

**Frustrations:**
- LinkedIn is too corporate and not Ethiopia-focused
- TikTok/Instagram don't have commerce
- Hard to find legitimate freelance work locally
- No professional global social network

**How Halehame helps:**
- Social feed → connect with professionals
- Task marketplace → find + post freelance work
- Marketplace → buy/sell devices and electronics
- Verified badge → build professional credibility
- Jobs board → find better employment

**Feature priorities for Yonas:** Feed, Tasks, Jobs, Profile, Messaging, Marketplace

---

### Persona 3: Mekdes — The Diaspora Professional

**Profile:**
- Age: 35 | Female | Washington DC, USA (Ethiopian origin)
- Education: Master's degree (Public Health)
- Occupation: Healthcare consultant
- Tech: iPhone + iPad, WhatsApp (to call Ethiopia), Facebook (Ethiopian community groups)
- Income: $80,000/year USD

**Goals:**
- Stay connected to family and Ethiopian news
- Send money home efficiently
- Buy Ethiopian products (tej, berbere, injera ingredients, habesha kemis)
- Support Ethiopian small businesses remotely
- Reconnect with culture

**Frustrations:**
- Facebook groups are chaotic and hard to buy from
- Can't pay in ETB directly
- No trusted marketplace for Ethiopian products
- Hard to discover Ethiopian creators and businesses
- Language barrier (prefers English interface)

**How Halehame helps:**
- English interface → comfortable for diaspora
- USD/ETB pricing → see prices in both
- Marketplace → buy from sellers worldwide
- Social feed → stay connected to community and culture
- Wallet → send ETB to family members
- Push notifications → stay updated on followed sellers

**Feature priorities for Mekdes:** Marketplace, Feed, English interface, USD display, Wallet

---

### Persona 4: Dawit — The Traditional Business Owner

**Profile:**
- Age: 45 | Male | Merkato market, Addis Ababa
- Education: Primary school
- Occupation: Wholesale fabric importer and retailer
- Tech: Basic Android phone, calls, SMS, doesn't use social media
- Income: ETB 20,000–50,000/month (cash)

**Goals:**
- Reach more retailers outside Merkato
- Keep a digital record of orders and payments
- Avoid carrying large amounts of cash
- Train his staff to use digital tools

**Frustrations:**
- All transactions are in cash — risky to carry
- No digital record of who bought what
- Can't reach customers outside Merkato easily
- Distrustful of unfamiliar technology
- Low digital literacy

**How Halehame helps:**
- Simple onboarding wizard → minimal reading required
- Showroom → display fabric catalog with photos
- Chapa → accept digital payment without a bank account
- Orders page → automatic record-keeping
- In-person seller support → workshops in Merkato

**Feature priorities for Dawit:** Extremely simple UI, Amharic interface, Chapa payment, Basic orders, No complex features

---

### Persona 5: Almaz — The Content Creator

**Profile:**
- Age: 21 | Female | Hawassa
- Education: University student (Marketing)
- Occupation: Part-time food blogger + TikTok creator (8K followers)
- Tech: Xiaomi Redmi, TikTok, Instagram, YouTube
- Income: ETB 1,000–3,000/month (brand deals)

**Goals:**
- Monetize her audience directly (not just brand deals)
- Sell her own products or merch to followers
- Build a business around her content
- Become known professionally in Ethiopia

**Frustrations:**
- TikTok/Instagram don't pay Ethiopian creators
- No platform to sell directly to her audience
- Brand deals are unpredictable income
- Can't build a portfolio/professional presence

**How Halehame helps:**
- Business profile + Showroom → sell merch directly
- Social feed → post content and grow following
- Marketplace → list food products (recipes, spice mixes)
- Verified Creator badge → build credibility
- Analytics → see how content performs

**Feature priorities for Almaz:** Feed, Stories, Creator tools, Business profile, Commerce

---

## Journey Maps

### Seller Journey: Tigist's First Sale

```
Week 1: Discovers Halehame via WhatsApp group share
        ↓
Day 1:  Registers with phone number
        ↓
Day 1:  Completes onboarding (personal profile)
        ↓
Day 2:  Adds business profile (clothing category)
        ↓
Day 2:  Opens Showroom Studio → picks "Fashion" template
        ↓
Day 3:  Uploads 5 product photos to Marketplace
        ↓
Day 4:  Shares her Showroom link to her WhatsApp contacts
        ↓
Day 5:  First inquiry in Chat from a buyer
        ↓
Day 6:  Buyer places order via Chapa → Tigist gets push notification
        ↓
Day 6:  Tigist marks order as "Processing" in Orders page
        ↓
Day 7:  Delivery arranged → marks "Completed" → commission deducted
        ↓
Day 7:  Reviews Halehame to friends: "It's like having a shop online"
```

### Buyer Journey: Yonas buying a second-hand phone

```
Opens Halehame → goes to Marketplace
        ↓
Searches "iPhone 12" → filters by distance (< 10km)
        ↓
Finds listing → views photos, reviews, seller profile
        ↓
Messages seller via Chat: "Is this still available?"
        ↓
Seller replies: "Yes, ETB 18,000"
        ↓
Yonas taps "Buy Now" → PurchaseModal opens
        ↓
Fills delivery address → pays with Chapa (CBE Birr)
        ↓
Order confirmed → notification to both buyer + seller
        ↓
Seller marks as "Processing" → Yonas sees status in Orders
        ↓
Item delivered → Yonas leaves 5-star review
```

---

## User Research Methods

### What we should do before/during launch:

| Method | Frequency | Goal |
|---|---|---|
| In-app feedback widget | Always on | Capture frustrations in the moment |
| User interviews (sellers) | Monthly | Understand seller pain points deeply |
| Analytics (PostHog/Mixpanel) | Daily review | See where users drop off |
| App Store reviews | Weekly | Surface recurring issues |
| Net Promoter Score (NPS) survey | Quarterly | Measure overall satisfaction |
| Usability testing | Before major features | Catch UX problems before they ship |

### Key questions to answer through research:
1. Why do sellers not complete their first product listing?
2. Why do buyers add to cart but not check out?
3. What brings users back on Day 7 vs. what causes churn?
4. What do users use most on mobile vs. desktop?
5. Where do users get confused / stuck?
