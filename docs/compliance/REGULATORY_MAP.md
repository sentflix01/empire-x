# Nodbusiness — Regulatory Map

> **Country-by-country regulatory requirements for operating Nodbusiness as a global platform.**
> Before entering any new market, review this document and consult local legal counsel.

---

## Acronyms Used in This Document

| Acronym | Full Form |
|---------|-----------|
| GDPR | General Data Protection Regulation (EU) |
| AML | Anti-Money Laundering |
| KYC | Know Your Customer |
| PSP | Payment Service Provider |
| EMI | Electronic Money Institution |
| MSB | Money Services Business |
| VAT | Value Added Tax |
| GST | Goods and Services Tax |
| SaaS | Software as a Service |
| PEP | Politically Exposed Person |
| FATF | Financial Action Task Force |
| DTT | Double Tax Treaty |
| FIU | Financial Intelligence Unit |
| OECD | Organisation for Economic Co-operation and Development |
| API | Application Programming Interface |
| TOS | Terms of Service |
| IP | Intellectual Property |
| DMCA | Digital Millennium Copyright Act (US) |
| NDA | Non-Disclosure Agreement |

---

## 1. How to Use This Document

This map covers the primary regulatory domains for each region Nodbusiness targets:
1. **Data Protection** — user privacy laws
2. **Payment / Financial** — money movement licenses and rules
3. **Tax** — VAT/GST and corporate tax obligations
4. **E-Commerce** — consumer protection laws
5. **Content** — what content is legal vs. prohibited
6. **Labor** — employment rules for local hires

Color-coded risk level: 🟢 Low complexity | 🟡 Medium complexity | 🔴 High complexity / major blocker

---

## 2. Europe

### 🇪🇺 European Union (all 27 member states)
| Domain | Rule | Risk | Action |
|--------|------|------|--------|
| Data Protection | GDPR — strict consent, data rights, 72-hour breach notification | 🔴 | DPA, cookie consent banner, privacy policy |
| Payments | PSD2 (Payment Services Directive 2) — open banking, strong customer authentication | 🟡 | Use Stripe (licensed) — Stripe handles SCA compliance |
| Tax | VAT OSS — register in one EU country, file centrally for all EU | 🟡 | Register for EU VAT OSS when B2C revenue > threshold |
| E-Commerce | EU Consumer Rights Directive — 14-day right of withdrawal | 🟡 | Return policy must comply |
| Content | DSA (Digital Services Act) — content moderation, transparency for large platforms | 🟡 | Moderation systems required |
| Labor | Local employment law varies by country | 🔴 | Use Employer of Record (EOR) for EU hires |

### 🇬🇧 United Kingdom
| Domain | Rule | Risk | Action |
|--------|------|------|--------|
| Data Protection | UK GDPR — parallel to EU GDPR post-Brexit | 🔴 | UK ICO registration required if UK users > threshold |
| Payments | FCA regulation — Stripe is FCA-authorized | 🟢 | Use Stripe |
| Tax | UK VAT — 20%, register if revenue from UK > £85,000 | 🟡 | Register and charge VAT |
| E-Commerce | Consumer Rights Act 2015 | 🟡 | Standard refund and returns policy |
| Content | Online Safety Act — illegal content removal obligations | 🟡 | Content moderation systems required |

### 🇩🇪 Germany (highlighted — largest EU economy)
| Domain | Rule | Risk | Action |
|--------|------|------|--------|
| Data Protection | GDPR + BDSG (Federal Data Protection Act) — stricter than base GDPR | 🔴 | German-language privacy policy required for .de users |
| Marketplace | Marketplace Facilitator Act — Nodbusiness may be liable for seller compliance | 🟡 | Seller vetting + ToS must cover liability allocation |
| Consumer | Fernabsatzgesetz — strong distance selling rules | 🟡 | 14-day returns, clear pricing |

---

## 3. Middle East & Africa

### 🇦🇪 United Arab Emirates (UAE)
| Domain | Rule | Risk | Action |
|--------|------|------|--------|
| Data Protection | Federal Decree Law No. 45 of 2021 — UAE data protection law | 🟡 | Privacy policy must cover UAE users |
| Payments | UAE Central Bank regulation — must use licensed PSP | 🟢 | Use licensed PSP (Stripe is not UAE-licensed; use Telr, PayTabs, or Checkout.com) |
| Tax | VAT — 5% on digital services | 🟡 | Register when B2C revenue from UAE > AED 375,000/year |
| E-Commerce | Consumer Protection Law — 15-day return right | 🟢 | Update returns policy |
| Content | Strictly regulated — no content offensive to Islam, no gambling, no political dissent | 🔴 | Content moderation critical; violations can cause shutdown |
| Labor | UAE Labour Law — specific rules for expatriate employees | 🟡 | Use local HR/EOR service |

### 🇸🇦 Saudi Arabia
| Domain | Rule | Risk | Action |
|--------|------|------|--------|
| Data Protection | PDPL (Personal Data Protection Law, 2021) — similar to GDPR | 🟡 | Consent mechanisms required |
| Payments | SAMA-regulated — use local PSP (HyperPay, PayTabs) | 🔴 | Stripe not directly licensed; use approved local gateway |
| Tax | VAT — 15% | 🟡 | Register when threshold met |
| Content | Strictly regulated — haram content, gambling, political content prohibited | 🔴 | Localized content policy required |

### 🇳🇬 Nigeria
| Domain | Rule | Risk | Action |
|--------|------|------|--------|
| Data Protection | NDPR (Nigeria Data Protection Regulation) — GDPR-inspired | 🟡 | Privacy policy + consent required |
| Payments | CBN licensed PSPs required — Paystack, Flutterwave | 🟢 | Use Paystack (Stripe subsidiary) |
| Tax | VAT — 7.5% on digital services | 🟡 | Register if revenue from Nigeria > threshold |
| E-Commerce | Federal Competition and Consumer Protection Commission | 🟡 | Transparent pricing and returns required |

### 🇪🇹 Ethiopia
| Domain | Rule | Risk | Action |
|--------|------|------|--------|
| Data Protection | No comprehensive data protection law yet — follow GDPR as best practice | 🟢 | Internal policy driven |
| Payments | NBE (National Bank of Ethiopia) regulates payments; Chapa, Telebirr are licensed | 🟡 | Use Chapa for ETB transactions |
| Tax | Corporate income tax 30%; VAT 15% | 🟡 | Register local entity, file monthly VAT |
| Foreign Exchange | Strict forex controls — USD in/out is restricted | 🔴 | Consult local legal counsel before cross-border transfers |
| Content | Government censorship risk — internet shutdowns have occurred | 🔴 | Have manual content review + rapid response plan |

### 🇰🇪 Kenya
| Domain | Rule | Risk | Action |
|--------|------|------|--------|
| Data Protection | Data Protection Act 2019 — strong law | 🟡 | Register as data controller with ODPC |
| Payments | CBK (Central Bank of Kenya) licensed — use M-Pesa API, Pesapal | 🟢 | Integrate local payment methods |
| Tax | VAT on digital services — 16% | 🟡 | Register when threshold met |

---

## 4. Asia-Pacific

### 🇸🇬 Singapore
| Domain | Rule | Risk | Action |
|--------|------|------|--------|
| Data Protection | PDPA (Personal Data Protection Act) — strong | 🟡 | Register as data organization, appoint DPO |
| Payments | MAS (Monetary Authority of Singapore) — Stripe is licensed | 🟢 | Use Stripe |
| Tax | GST — 9% on digital services from 2024; register if B2C > SGD 100,000 | 🟡 | Register and charge GST |
| E-Commerce | Consumer Protection (Fair Trading) Act | 🟢 | Standard compliance |
| Content | MDA (Media Development Authority) — content regulation | 🟡 | Restrict illegal content |

### 🇮🇳 India
| Domain | Rule | Risk | Action |
|--------|------|------|--------|
| Data Protection | DPDP Act (Digital Personal Data Protection Act, 2023) — new law in effect | 🔴 | Consent framework required, data localization for some data |
| Payments | RBI (Reserve Bank of India) — only RBI-approved gateways | 🔴 | Use Razorpay, PayU (not direct Stripe) |
| Tax | GST — 18% on digital services; TDS (Tax Deducted at Source) on marketplace commissions | 🔴 | Complex compliance; use local tax advisor |
| E-Commerce | Consumer Protection (E-Commerce) Rules 2020 | 🟡 | Grievance officer, return policy required |
| Content | IT Act — intermediary liability, content takedown obligations | 🟡 | Grievance officer required for India users |
| FDI | FDI (Foreign Direct Investment) restrictions on e-commerce inventory models | 🟡 | Marketplace model (not inventory) is generally permitted |

### 🇮🇩 Indonesia
| Domain | Rule | Risk | Action |
|--------|------|------|--------|
| Data Protection | GR 71 / PDP Law 2022 | 🟡 | Data localization obligations pending |
| Payments | Bank Indonesia regulated — use Midtrans, DOKU | 🟡 | Local PSP required |
| Tax | VAT — 11%; digital services taxable | 🟡 | Register with DGT |
| E-Commerce | Government Regulation on e-commerce | 🟡 | Register as e-commerce player |

### 🇦🇺 Australia
| Domain | Rule | Risk | Action |
|--------|------|------|--------|
| Data Protection | Privacy Act 1988 + Australian Privacy Principles | 🟡 | Privacy policy required |
| Payments | AUSTRAC (AML/CTF regulator) — register if providing digital currency services | 🟡 | Register with AUSTRAC if crypto features added |
| Tax | GST — 10%; register if revenue from AU > AUD 75,000 | 🟡 | Register and charge GST |
| Consumer | Australian Consumer Law — statutory guarantees | 🟢 | Refund/returns policy compliance |

---

## 5. Americas

### 🇺🇸 United States
| Domain | Rule | Risk | Action |
|--------|------|------|--------|
| Data Protection | No federal law — patchwork of state laws (CCPA/CA, CPRA, NY SHIELD, etc.) | 🔴 | CCPA compliance required for California users; privacy policy |
| Payments | FinCEN — MSB (Money Services Business) registration if processing payments + holding funds | 🔴 | Use Stripe (licensed); avoid holding user funds to stay exempt |
| Tax | No federal SaaS tax; state sales tax varies | 🟡 | Use Stripe Tax or Avalara |
| Content | Section 230 (CDA) — platform immunity for third-party content | 🟢 | Maintain moderation + DMCA takedown process |
| AML | FinCEN regulations apply | 🟡 | AML policy + SAR filing obligations |
| ESOP | SEC regulations on equity compensation | 🟡 | US legal counsel required for ESOP setup |

### 🇧🇷 Brazil
| Domain | Rule | Risk | Action |
|--------|------|------|--------|
| Data Protection | LGPD (Lei Geral de Proteção de Dados) — very similar to GDPR | 🔴 | Appoint DPO, consent mechanisms, privacy policy in Portuguese |
| Payments | BACEN (Central Bank of Brazil) — Pix is the national payment rail | 🟡 | Integrate Pix via local PSP |
| Tax | Complex multi-tier tax system (federal + state + municipal) | 🔴 | Local tax advisor essential |

### 🇨🇦 Canada
| Domain | Rule | Risk | Action |
|--------|------|------|--------|
| Data Protection | PIPEDA — data protection act; Quebec Law 25 (stricter) | 🟡 | Consent + privacy policy required |
| Payments | FINTRAC — register as MSB if money services provided | 🟡 | Register with FINTRAC if handling payments |
| Tax | GST/HST — 5–15% on digital services; register if revenue > CAD 30,000 | 🟡 | Register and charge GST/HST |

---

## 6. Regulatory Priority Order

Phase the compliance work in order of market entry:

### Launch Phase (global online, no employees)
```
Priority 1 (do now):
  □ GDPR compliance (largest user base, highest fines)
  □ Stripe terms compliance (payment partner requirements)
  □ CCPA opt-out mechanism (California users)
  □ AML/KYC policy in place

Priority 2 (within 90 days):
  □ UK ICO registration
  □ EU VAT OSS registration
  □ DMCA takedown process (US content law)
  □ NDPR compliance for Nigerian users

Priority 3 (before Series A):
  □ Singapore PDPA registration
  □ Australia GST registration
  □ Legal entity in key market (UK or Singapore)
  □ Transfer pricing documentation
```

### Expansion Phase (employees in-country)
Before hiring any local employee:
```
  □ Legal entity registered in that country
  □ Local employment law reviewed
  □ Local payroll/HR system set up
  □ PE tax risk assessed
  □ Local bank account open
```

---

## 7. Regulatory Watch List

These regulations are changing and must be monitored:

| Region | Upcoming Change | Timeline | Impact |
|--------|----------------|----------|--------|
| EU | AI Act — regulations on AI systems | 2025–2026 | AI features may need review |
| India | DPDP Act implementation rules | 2024–2025 | Data localization may be required |
| USA | Federal privacy law | Uncertain | May simplify state-by-state compliance |
| Global | FATF VASP rules for crypto | Ongoing | If crypto features added |
| EU | DSA obligations for large platforms | 2024+ | Content moderation at scale |

---

*Owner: CEO (Phase 1), General Counsel / Chief Compliance Officer (Phase 2+)*
*Review cycle: Semi-annually, or when entering a new market*
*Legal counsel required before entering any new market.*
