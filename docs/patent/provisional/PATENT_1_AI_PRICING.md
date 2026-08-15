# Provisional Patent Application Draft
# Patent 1: AI Dynamic Template Pricing Method

> **Classification:** CONFIDENTIAL — Attorney-Client Privileged
> **Status:** DRAFT — To be reviewed and filed by patent attorney
> **Priority:** CRITICAL — File before public launch
> **Inventor(s):** [Founder Full Legal Name], [City, Country]
> **Assignee:** Halehame Technologies PLC
> **Date of Conception:** August 2026

---

## TITLE OF INVENTION

**Method and System for Dynamically Pricing Digital Business Templates
Using Real-Time Demand, Quality, and Competitive Density Signals**

---

## FIELD OF THE INVENTION

This invention relates to digital marketplace platforms, and more specifically
to a method for automatically calculating and adjusting the price of digital
business templates using a combination of real-time demand signals, template
quality metrics, and competitive density analysis within a category-based
business marketplace.

---

## BACKGROUND

Existing digital template marketplaces (e.g., website builders, e-commerce
platforms, no-code website tools) price their templates using one of two
approaches:

1. **Fixed pricing** — A flat subscription fee regardless of which template
   a user selects (e.g., Shopify: $29/month for all themes, Squarespace:
   $16/month for all templates).

2. **Manual pricing** — Template creators set a fixed price that does not
   change based on market demand or template quality performance.

These approaches have significant limitations:
- Fixed pricing undervalues highly demanded templates and overvalues
  unpopular ones, reducing developer revenue and platform efficiency.
- Manual pricing requires constant human intervention and does not respond
  to real-time market signals.
- Neither approach reflects the actual competitive value of a template
  within a specific business category at a specific point in time.
- Neither approach incentivizes developers to maintain quality after
  a template achieves initial popularity.

There exists a need for a system that automatically calculates and adjusts
template prices based on objective, real-time signals that reflect actual
market demand, quality, and competitive context.

---

## SUMMARY OF THE INVENTION

The present invention provides a computer-implemented method for dynamically
pricing digital business templates in a marketplace platform comprising:

(a) continuously collecting demand signals for each template including
    view count, installation rate, and user retention rate;

(b) continuously collecting quality signals for each template including
    average user rating, accessibility compliance score, and
    performance benchmark score;

(c) calculating a competition density factor based on the number of active
    business accounts in the same business category as the template;

(d) computing a unified price multiplier by applying weighted coefficients
    to the demand signals, quality signals, and competition density factor;

(e) automatically adjusting the display price of each template within
    a developer-defined price range using the computed multiplier;

(f) presenting visual demand indicators (e.g., "High Demand", "Popular")
    to users when a template's price multiplier exceeds defined thresholds.

---

## DETAILED DESCRIPTION OF THE PREFERRED EMBODIMENT

### 1. System Architecture

The system comprises:
- A template marketplace database storing template metadata, pricing parameters,
  and developer-defined minimum and maximum prices
- A signal collection module that aggregates user interaction data in real-time
- A pricing engine that executes the dynamic pricing algorithm
- A presentation layer that displays prices and demand indicators to users
- An analytics dashboard that displays pricing history and revenue data to developers

### 2. Signal Collection

**2.1 Demand Signals**
The system continuously monitors the following demand signals for each template T:

```
view_count(T, t)         = number of unique views in time window t
install_rate(T, t)       = installs / views in time window t
retention_rate(T, t)     = percentage of users still using T after 30 days
```

**2.2 Quality Signals**
The system evaluates each template against objective quality criteria:

```
user_rating(T)           = average star rating from verified users (1.0–5.0)
accessibility_score(T)   = automated WCAG compliance score (0.0–1.0)
performance_score(T)     = page load speed score (0.0–1.0)
```

**2.3 Competition Density**
The system measures category competitiveness:

```
category_density(C)      = count of active business accounts in category C
                           during the current pricing period
```

### 3. Price Multiplier Calculation

The pricing engine computes a price multiplier M for template T in category C:

```
demand_score    = (w1 × normalized_view_count) +
                  (w2 × install_rate) +
                  (w3 × retention_rate)

quality_score   = (w4 × user_rating / 5.0) +
                  (w5 × accessibility_score) +
                  (w6 × performance_score)

competition_factor = log(1 + category_density(C)) / normalization_constant

M = base_multiplier × demand_score × quality_score × competition_factor
```

Where w1–w6 are learned or configured weights, and base_multiplier is the
platform's baseline pricing coefficient.

### 4. Price Adjustment

The final displayed price P for template T is:

```
P = clamp(developer_base_price × M, developer_min_price, developer_max_price)
```

Where `clamp` constrains the price within the developer-defined range,
ensuring the developer retains control over minimum and maximum pricing.

### 5. Visual Demand Indicators

When M exceeds threshold T_high, the system displays a "High Demand" indicator.
When M falls below threshold T_low, the system may display a "Best Value" indicator.
These indicators are displayed without revealing the underlying algorithm to users.

### 6. Update Frequency

The pricing engine runs at configurable intervals (default: every 24 hours)
to prevent rapid price fluctuations that would confuse users, while still
responding to meaningful market changes.

---

## CLAIMS (PRELIMINARY — TO BE REFINED BY ATTORNEY)

1. A computer-implemented method for dynamic pricing of digital templates comprising:
   collecting real-time demand signals for each template;
   collecting quality evaluation scores for each template;
   calculating a competitive density factor based on the business category
   of the template; and
   automatically adjusting the price of each template based on a weighted
   combination of said demand signals, quality scores, and competitive density factor.

2. The method of claim 1, wherein the demand signals comprise view count,
   install rate, and user retention rate.

3. The method of claim 1, wherein the quality evaluation scores comprise
   user ratings, accessibility compliance scores, and performance benchmark scores.

4. The method of claim 1, further comprising constraining the adjusted price
   within a developer-specified minimum and maximum price range.

5. The method of claim 1, further comprising displaying a visual demand
   indicator to users when the computed price multiplier exceeds a threshold,
   without revealing the underlying algorithm or multiplier value.

6. A system for dynamically pricing digital business templates comprising:
   a signal collection module configured to collect demand and quality signals;
   a pricing engine configured to compute a price multiplier using a weighted algorithm;
   a pricing database configured to store template prices and developer price ranges;
   a presentation module configured to display adjusted prices and demand indicators.

---

## ABSTRACT

A computer-implemented method and system for automatically pricing digital
business templates in a marketplace platform. The system continuously
monitors demand signals (view count, install rate, retention), quality
metrics (user ratings, accessibility, performance), and competitive density
within business categories to compute a dynamic price multiplier. Template
prices are automatically adjusted within developer-defined ranges using this
multiplier, and visual demand indicators are presented to users when demand
thresholds are exceeded. This method eliminates the limitations of fixed and
manual pricing by creating a responsive, market-driven pricing system that
incentivizes both template quality and developer participation.

---

## DRAWINGS NEEDED

(To be created with patent attorney)
- Figure 1: System architecture diagram
- Figure 2: Signal collection flow diagram
- Figure 3: Price multiplier calculation flowchart
- Figure 4: User interface showing demand indicators
- Figure 5: Developer dashboard showing price history

---

## PRIOR ART REFERENCES

(To be completed during attorney review)
- Shopify App Store pricing: fixed fees
- Wix App Market: fixed/manual pricing
- Apple App Store: fixed 70/30 with manual developer pricing
- Amazon Marketplace: demand-based product pricing (different domain)

---

*This draft is prepared for review by a licensed patent attorney.*
*Do not file this document directly — it requires professional legal preparation.*
*All information herein is confidential and proprietary to Halehame Technologies.*
