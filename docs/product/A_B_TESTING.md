# Nodbusiness — A/B Testing Framework

> How Nodbusiness runs controlled experiments to make data-driven product decisions.
> Every significant UI or feature change should be measured before a full rollout.
> Last updated: August 2026

---

## Acronyms Used in This Document

| Acronym | Full Form |
|---------|-----------|
| A/B | A/B Testing — comparing variant A (control) vs. variant B (test) |
| MAU | Monthly Active Users |
| DAU | Daily Active Users |
| GMV | Gross Merchandise Value |
| CTR | Click-Through Rate |
| CVR | Conversion Rate |
| MDE | Minimum Detectable Effect — the smallest change worth detecting |
| SRM | Sample Ratio Mismatch — when actual split differs from intended split |
| API | Application Programming Interface |
| UI | User Interface |
| UX | User Experience |

---

## 1. Why A/B Test

Intuition about UI changes is often wrong. A/B tests replace guesses with evidence.

**Examples of changes that surprised teams globally:**
- A brighter CTA (Call-to-Action) button color increased purchases by 21%
- Showing "only 3 left in stock" increased add-to-cart by 15%
- Removing a form field increased completion by 30%
- A shorter product description outperformed the longer one

At Nodbusiness, we run A/B tests on changes that affect:
- Checkout conversion
- Seller onboarding completion
- Feed engagement (likes, comments, shares)
- Marketplace click-through rate
- Subscription upgrade rate

---

## 2. A/B Test Architecture

### Experiment Assignment

Users are assigned to experiment variants using a **deterministic hash** of their user ID:

```javascript
// backend/lib/experiments.js
function getVariant(userId, experimentName, variants = ['control', 'treatment']) {
  const hash = crypto.createHash('md5')
    .update(`${userId}:${experimentName}`)
    .digest('hex');
  const bucket = parseInt(hash.slice(0, 8), 16) % 100; // 0–99
  
  // Example: 50/50 split
  if (bucket < 50) return variants[0]; // control
  return variants[1]; // treatment
}
```

**Why deterministic hash:**
- Same user always sees the same variant (consistent experience)
- No database lookup required (fast)
- Independent per experiment (user in control for Experiment A can be in treatment for Experiment B)

### Where Experiments Are Evaluated

| Layer | When | Example |
|-------|------|---------|
| Backend (API response) | Feature-level | Return `layout_v2: true` in user preferences |
| Frontend (component) | UI-level | `const variant = useExperiment('checkout_button_color')` |
| Feature flags | Kill switch | Disable treatment instantly if regression detected |

---

## 3. Experiment Lifecycle

```
1. HYPOTHESIS
   "Showing estimated delivery date on the product page will increase
   add-to-cart rate by at least 5%."

2. DESIGN
   - Control (A): Product page without delivery estimate
   - Treatment (B): Product page with "Est. delivery: 2–4 days" message
   - Split: 50/50
   - Duration: 14 days minimum (to reach statistical significance)
   - Primary metric: Add-to-cart rate
   - Secondary metrics: Order rate, bounce rate

3. IMPLEMENT
   - Add experiment to feature flags table
   - Implement control and treatment in code
   - Add analytics events to track both variants

4. RUN
   - Deploy with experiment OFF
   - Enable experiment for 50% of users via feature flags
   - Monitor daily for SRM (Sample Ratio Mismatch) and crashes

5. ANALYZE
   - After 14 days: calculate statistical significance (p < 0.05)
   - Check primary metric + secondary metrics
   - Check for regression in other metrics

6. DECIDE
   - Win (p < 0.05, positive): Ship treatment to 100%
   - No significant result: Run longer or abandon
   - Loss (treatment hurts metrics): Roll back immediately

7. DOCUMENT
   - Add result to experiment log (below)
   - Remove experiment code if shipping treatment
   - Share learnings with team
```

---

## 4. Statistical Requirements

### Minimum Sample Size
Use a sample size calculator before starting any experiment.

**Inputs:**
- Baseline conversion rate (e.g., current add-to-cart rate = 12%)
- Minimum Detectable Effect (MDE) = 10% relative improvement (= 1.2 percentage points)
- Statistical power = 80%
- Significance level = 5% (p < 0.05)

**Tool:** https://www.evanmiller.org/ab-testing/sample-size.html

**Rule:** Do not stop an experiment early because it looks like a win. Peeking inflates false positive rate. Run the pre-calculated duration.

### Interpreting Results

| p-value | Interpretation |
|---------|---------------|
| < 0.05 | Statistically significant |
| 0.05 – 0.10 | Marginal — may need more data |
| > 0.10 | Not significant — no detectable effect |

Always report **confidence intervals**, not just p-values.

---

## 5. Metrics by Experiment Area

### Checkout / Commerce
- **Primary:** Checkout completion rate (orders / unique visitors to checkout)
- **Secondary:** GMV per session, cart abandonment rate

### Seller Onboarding
- **Primary:** Showroom creation rate (showrooms created / accounts registered as business)
- **Secondary:** First product listed rate, D7 seller retention

### Feed / Social
- **Primary:** Posts per DAU per week
- **Secondary:** Comments per post, time in feed per session

### Subscription
- **Primary:** Upgrade rate (free → paid conversion)
- **Secondary:** Trial-to-paid rate, upgrade by plan tier

---

## 6. Experiment Log

| Experiment | Hypothesis | Start | End | Result | Decision |
|-----------|-----------|-------|-----|--------|---------|
| *(first experiment)* | | | | | |

---

## 7. Anti-Patterns to Avoid

| Anti-Pattern | Problem | Fix |
|-------------|---------|-----|
| Stop early on a win | Inflates false positive rate | Pre-commit to duration |
| Test many things at once | Interactions between experiments | One experiment per page area at a time |
| Small sample | Underpowered — misses real effects | Calculate sample size first |
| Only check primary metric | Treatment may hurt secondary metrics | Always check 3–5 metrics |
| Run A/A test | Expect 0% difference — if you see > 5%, your assignment is broken | Validate assignment before every experiment |

---

## 8. Tools

**Phase 1 (current):** Feature flags in `feature_flags` table + analytics events in PostHog or Mixpanel

**Phase 2 (planned):** Dedicated experimentation platform:
- [GrowthBook](https://www.growthbook.io/) — open source, integrates with any analytics
- [Optimizely](https://www.optimizely.com/) — enterprise
- [Statsig](https://www.statsig.com/) — developer-first

---

*Owner: Product team*
*Review: After every experiment completes — update the Experiment Log*
