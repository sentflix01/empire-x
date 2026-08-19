# Showroom Section Types — Global Business Coverage Audit

## The Core Insight

Every business website in the world — from an Ethiopian coffee farm to a Wall Street law firm —
needs combinations of the same ~15 building blocks. The difference is:
  - **Which blocks** they need
  - **What those blocks are called** in their industry
  - **What fields** each block contains

A restaurant calls it "Menu". A law firm calls it "Practice Areas". A hotel calls it "Room Types".
Under the hood, all three are the same `items` section type with different field labels.

## The 15 Universal Section Types

| Section Type | What It Is | Used By |
|---|---|---|
| `hero` | First impression — name, tagline, CTA | Every business |
| `about` | Who you are, your story, values | Every business |
| `services` | What you offer (non-physical) | Service businesses |
| `items` | Products/menu/listings with price | Retail, food, real estate |
| `team` | People behind the business | Agencies, clinics, firms |
| `gallery` | Visual portfolio, photos | Creative, hospitality, food |
| `testimonials` | Social proof, reviews, quotes | Every business |
| `faq` | Common questions answered | Every business |
| `contact` | How to reach you | Every business |
| `hours` | When you're open | Retail, food, service |
| `locations` | Where you are (map) | Multi-location businesses |
| `pricing` | Tiered pricing plans | SaaS, agencies, gyms |
| `process` | How you work, step-by-step | Agencies, construction |
| `social` | Social media links, feed | Influencers, brands |
| `cta` | Call to action banner | Every business |

## The Real Problem: 500 Business Types, 15 Sections

The challenge is mapping the global taxonomy (1st → 5th class) to these 15 sections
intelligently. Not by hardcoding every business type, but by:

1. **Categorizing at 2nd Class level** (20 categories covers 95% of global businesses)
2. **Mapping each category to a template** (which sections, what labels, what order)
3. **Letting the user customize** within that template

## The 20 Universal Business Categories (for Nodbusiness)

These 20 categories map to the global 1st/2nd class taxonomy and cover every business
a user in Ethiopia (or globally) would want to create a showroom for:

| # | Category Key | Display Name | Global 2nd Class Equivalent |
|---|---|---|---|
| 1 | `restaurant` | Food & Dining | Hospitality / Food Manufacturing |
| 2 | `retail` | Shop & Retail | Retail & Wholesale Trade |
| 3 | `service` | General Services | Personal Services |
| 4 | `health` | Health & Wellness | Healthcare Services |
| 5 | `beauty` | Beauty & Grooming | Personal Services |
| 6 | `education` | Education & Training | Education Services |
| 7 | `realestate` | Real Estate | Real Estate Services |
| 8 | `technology` | Technology & IT | Information Technology |
| 9 | `creative` | Creative & Design | Professional Services / Digital Media |
| 10 | `legal` | Legal & Consulting | Professional Services |
| 11 | `finance` | Finance & Insurance | Financial Services |
| 12 | `construction` | Construction & Engineering | Construction |
| 13 | `automotive` | Automotive | Automotive Manufacturing / Retail |
| 14 | `agriculture` | Agriculture & Food | Primary Sector |
| 15 | `manufacturing` | Manufacturing & Industry | Secondary Sector |
| 16 | `logistics` | Transport & Logistics | Transportation & Logistics |
| 17 | `entertainment` | Entertainment & Events | Media & Entertainment |
| 18 | `nonprofit` | NGO & Non-profit | Quinary Sector |
| 19 | `hospitality` | Hotel & Travel | Hospitality & Tourism |
| 20 | `ecommerce` | Online Store | E-commerce |

## Section Mapping Per Category

| Category | Sections (in order) | Key Customizations |
|---|---|---|
| `restaurant` | hero, about, items[menu], gallery, hours, testimonials, contact, social | items = "Our Menu" with name/price/image |
| `retail` | hero, items[products], gallery, testimonials, hours, contact, social | items = "Our Products" |
| `service` | hero, about, services, process, team, testimonials, faq, contact | services = "What We Offer" |
| `health` | hero, about, services[treatments], team, hours, testimonials, faq, contact | team = "Our Doctors" |
| `beauty` | hero, gallery, services[treatments], team, hours, pricing, testimonials, contact | pricing = "Treatment Prices" |
| `education` | hero, about, services[courses], team[instructors], process, pricing, testimonials, contact | team = "Our Instructors" |
| `realestate` | hero, items[listings], about, team[agents], process, testimonials, contact, locations | items = "Current Listings" |
| `technology` | hero, about, services[solutions], process, team, pricing, testimonials, cta, contact | pricing = "Our Plans" |
| `creative` | hero, gallery[portfolio], services, process, team, pricing, testimonials, contact | gallery = "Our Work" |
| `legal` | hero, about, services[practice_areas], team[attorneys], process, testimonials, faq, contact | services = "Practice Areas" |
| `finance` | hero, about, services[products], team, process, testimonials, faq, contact | services = "Financial Products" |
| `construction` | hero, gallery[projects], services, process, team, testimonials, contact, locations | gallery = "Our Projects" |
| `automotive` | hero, items[vehicles], services, gallery, team, hours, testimonials, contact | items = "Our Vehicles" |
| `agriculture` | hero, about, items[products], process, gallery, testimonials, contact | items = "Our Products" |
| `manufacturing` | hero, about, items[products], process, team, gallery, testimonials, contact | items = "Our Products" |
| `logistics` | hero, about, services, process, team, testimonials, contact, locations | process = "How It Works" |
| `entertainment` | hero, gallery[events], services, team, testimonials, social, contact | gallery = "Events & Photos" |
| `nonprofit` | hero, about, services[programs], team, process, testimonials, cta[donate], contact | cta = "Support Our Mission" |
| `hospitality` | hero, gallery[rooms], items[accommodation], services[amenities], testimonials, hours, contact | items = "Our Rooms" |
| `ecommerce` | hero, items[products], about, testimonials, faq, contact, social | items = "Our Store" |
