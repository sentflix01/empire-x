# Halehame — Due Diligence Checklist

> **Classification:** Confidential
> **Purpose:** Every document an investor will request before closing.
> Prepare all of these BEFORE you start fundraising so you can close fast.
> Slow due diligence kills deals. Be ready.

---

## What Is Due Diligence?

After a term sheet is signed, investors verify everything you've told them.
They will ask for documents. You provide them in a "data room" — a shared
folder (Google Drive or Dropbox) organized clearly.

**Timeline:** Usually 2–6 weeks. Longer if you're slow.
**Your goal:** Close in 2 weeks. Have everything ready before they ask.

---

## How to Organize Your Data Room

```
Halehame Data Room/
│
├── 01_Company/
│   ├── Certificate of Incorporation (Ethiopian PLC or Delaware Corp)
│   ├── Articles of Association / Bylaws
│   ├── Board Resolutions
│   └── Registered Office + TIN
│
├── 02_Capitalization/
│   ├── Cap Table (current, fully diluted)
│   ├── All SAFE agreements signed
│   ├── Option pool documentation
│   └── Shareholder register
│
├── 03_Financial/
│   ├── Bank statements (last 6 months)
│   ├── Financial model + projections
│   ├── Revenue history (if any)
│   └── Expense history
│
├── 04_Legal_IP/
│   ├── Trademark filings + certificates
│   ├── Patent applications (provisional numbers)
│   ├── Copyright registrations
│   ├── License file from codebase
│   └── IP assignment agreements from all developers
│
├── 05_Team/
│   ├── Founder CVs / LinkedIn profiles
│   ├── All employee contracts
│   ├── All contractor agreements with IP assignment
│   ├── All NDAs signed
│   └── Option grant agreements
│
├── 06_Product/
│   ├── Product demo video (2–3 min)
│   ├── Screenshots of key features
│   ├── Technical architecture document
│   ├── GitHub repository access (private read access)
│   └── Security documentation (encryption, auth, data storage)
│
├── 07_Market/
│   ├── Market size research (TAM/SAM/SOM)
│   ├── Competitor analysis
│   ├── Customer development interviews (if done)
│   └── Letters of Intent from potential customers
│
├── 08_Legal_Agreements/
│   ├── Terms of Service (live version)
│   ├── Privacy Policy (live version)
│   ├── Any customer contracts
│   └── Any vendor agreements
│
└── 09_Previous_Financing/
    ├── All previous investment documents
    ├── All SAFE agreements
    └── Any debt instruments
```

---

## Checklist — Prepare Each Item

### Company Documents
- [ ] Certificate of Incorporation (Ethiopian PLC registration certificate)
- [ ] Articles of Association (Memorandum of Association)
- [ ] TIN (Tax Identification Number) certificate
- [ ] Registered office address proof
- [ ] Board of Directors resolution authorizing fundraising
- [ ] If Delaware Corp: Certificate of Incorporation + Bylaws

### Cap Table & Equity
- [ ] Cap table in Carta, Pulley, or Excel — fully diluted
- [ ] All SAFE agreements (signed copies)
- [ ] Founder share certificate(s)
- [ ] Founder vesting agreement
- [ ] Option pool resolution + any granted options
- [ ] Shareholder register (official record of all shareholders)

### Financial Records
- [ ] Business bank account statements (last 6 months)
- [ ] Revenue records (invoices, Stripe dashboard exports, etc.)
- [ ] Expense records (rent, salaries, subscriptions)
- [ ] Financial model with 3-year projections
- [ ] Current burn rate calculation

### Intellectual Property
- [ ] Trademark application receipt(s) with filing dates
- [ ] Provisional patent application numbers
- [ ] OriginStamp blockchain timestamp certificate (codebase)
- [ ] GitHub repository — invite investor as read-only collaborator
- [ ] IP assignment clause in all developer/contractor agreements
- [ ] LICENSE file from repository (proprietary license)
- [ ] List of all open-source dependencies + their licenses

### Team & HR
- [ ] Founder CV / resume (1 page)
- [ ] Co-founder CV (if applicable)
- [ ] All employee employment contracts
- [ ] All contractor/freelancer agreements (with IP assignment clause)
- [ ] All signed NDAs
- [ ] Any advisor agreements + equity grants
- [ ] Proof that no team member is a non-compete violation from previous employer

### Product & Technology
- [ ] 2–3 minute product demo video
- [ ] Screenshots of all major features
- [ ] Technical architecture document (high-level diagram)
- [ ] Security documentation:
  - Authentication method (JWT + HttpOnly cookies ✅)
  - Data encryption at rest (Neon PostgreSQL ✅)
  - Data encryption in transit (HTTPS/TLS ✅)
  - Penetration testing (if done)
- [ ] Uptime/reliability record (if live)
- [ ] API documentation

### Market Validation
- [ ] Market size research with sources
- [ ] Competitive analysis (your honest assessment vs. competitors)
- [ ] Customer development interviews:
  - Who did you talk to?
  - What did they say about willingness to pay?
- [ ] Letters of Intent (LOIs) from potential customers
- [ ] Waitlist size and quality
- [ ] Any press coverage, awards, or recognition

### Legal & Compliance
- [ ] Terms of Service (live on website)
- [ ] Privacy Policy (live on website, GDPR compliant)
- [ ] Developer Agreement (for marketplace — even if not live yet)
- [ ] Seller Agreement
- [ ] Any existing customer contracts (signed)
- [ ] Proof of compliance: GDPR data deletion capability, cookie consent
- [ ] List of any pending litigation or disputes (even small ones)

### Previous Financing
- [ ] All previous investment documents
- [ ] All SAFE notes signed
- [ ] Any debt, loans, or convertible notes outstanding
- [ ] Any grants received + grant terms

---

## Common Due Diligence Questions Investors Ask

### About the Market
```
Q: How did you calculate your TAM?
A: Cite sources. Use bottom-up analysis. "X million businesses × $Y average spend."

Q: Why is this the right time for this market?
A: Mobile internet adoption in Africa growing 20% annually. Digital payments
   infrastructure matured. COVID accelerated SMB digitization.

Q: Who is your ideal customer?
A: Small business owner with 1–50 employees, selling physical goods or services,
   currently using WhatsApp or word-of-mouth. No technical skills.
```

### About the Product
```
Q: What is your unfair advantage?
A: Three-layer answer:
   1. We are the only platform combining social + showroom + commerce in one
   2. AI-priced template marketplace (patented method) — novel and defensible
   3. We built this — fully functional platform with 252 tests and 0 TS errors

Q: How defensible is this?
A: Network effects: Each business brings customers. Each customer discovers businesses.
   Data moat: AI pricing improves with more transaction data.
   Patents: 3 provisional applications filed.
   Developer ecosystem: 50+ developers will be invested in our success by Phase 2.

Q: What's the biggest technical risk?
A: Scale — we're on Railway/Vercel/Neon which may need upgrading at 100K+ users.
   Mitigation: Architecture is cloud-agnostic. We can migrate to AWS/GCP if needed.
```

### About the Team
```
Q: Why are you the right person to build this?
A: Be specific. What experience, connections, or knowledge do you have that
   another founder would not? Don't be generic.

Q: What happens if the technical co-founder leaves?
A: The codebase is documented. We have an SOP. I am also technical.
   [Have a real answer — investors fear this]

Q: Have you worked together before?
A: [Honest answer about team history]
```

### About the Business Model
```
Q: What is your CAC?
A: Currently $0 (organic only). Business-led growth — each business brings customers.
   Phase 2 paid CAC target: $30/business based on comparable platforms.

Q: What is your churn rate?
A: Pre-launch, no data. Target: <3% monthly based on high switching cost
   (businesses have published content, customer relationships, order history on platform).

Q: What happens if a large competitor (Shopify/Meta) copies you?
A: They would need to: (1) add a social feed to their commerce tool
   OR (2) add commerce to their social platform.
   Both are architecture changes requiring years. We'll have network effects
   and a data moat before either happens. We also have 3 patents pending.
```

### About Financials
```
Q: How long does $1M last you?
A: 46 months at our current burn ($21,500/month at full team).
   At Month 18 we should hit $25K MRR — approaching break-even.
   Series A would be raised from a position of strength, not desperation.

Q: What are your unit economics?
A: CAC: $30 target | LTV: $696 (24-month retention × $29 avg ARPU) | LTV:CAC: 23:1
   Gross margin: 82% | Payback period: 1.2 months

Q: Why this valuation?
A: Comparable seed rounds in African SaaS: $2M–$8M pre-money.
   We are at the lower end because we have no revenue yet.
   But: We have a fully built platform (saves 18+ months dev time = $300K+ value)
   + 3 patents pending + trademark filed. $4M is conservative.
```

---

## Data Room Tips

```
1. Use numbered folders (01_, 02_) so files appear in logical order
2. Name files clearly: "Cap_Table_Halehame_2026-08-15.xlsx" not "final.xlsx"
3. Use Google Drive with "Anyone with link can view" (not edit)
4. Send the data room link ONLY after NDA is signed
5. Track who accesses what (Google Drive tracks views)
6. Remove access immediately if deal falls through
7. Never put actual secrets (algorithm code, algorithm weights) in the data room
8. Update the data room promptly when documents change
```

---

*This checklist is confidential. Prepare all items before any investor conversation.*
*A fully prepared data room signals professionalism and closes deals faster.*
