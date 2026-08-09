# Empire X — Safety, Trust & Platform Integrity

> How Empire X keeps users safe, builds trust, and prevents abuse at scale.
> **Last updated:** August 2026

---

## Trust Is the Product

In the Ethiopian market, **trust is the primary barrier to e-commerce adoption**. Buyers fear:
- Receiving a different/damaged item
- Paying and getting nothing
- Being scammed by fake sellers
- Their personal data being misused

Sellers fear:
- Buyers not paying (COD risk)
- Fake orders wasting their time
- Negative reviews from bad-faith buyers
- Their products being copied

**Every trust feature we build increases GMV more than any marketing spend.**

---

## Current Trust Infrastructure

### For Buyers
| Feature | Status | Impact |
|---|---|---|
| Seller verified badge | ✅ Built | High — visual trust signal |
| Product reviews with star rating | ✅ Built | High — social proof |
| Return request system | ✅ Built | High — safety net |
| Delivery tracking timeline | ✅ Built | Medium — visibility |
| Buyer protection message | ✅ Built (static text) | Low — needs substance |
| Escrow / payment hold | ❌ Not built | Very High — real protection |
| Order confirmation email | ✅ Built | Medium |

### For Sellers
| Feature | Status | Impact |
|---|---|---|
| User profile (history, connections) | ✅ Built | Medium |
| Verified buyer badge | ❌ Not built | Medium |
| COD fraud prevention | ❌ Not built | High |
| Dispute resolution process | ❌ Defined only in policy | High |

### Platform Integrity
| Feature | Status | Impact |
|---|---|---|
| Report content/users | ✅ Built | High |
| Block users | ✅ Built | High |
| Admin ban/unban | ✅ Built (August 2026) | High |
| Flagged content review | ✅ Built | Medium |
| CSAM reporting pipeline | ❌ Not built | Critical |
| Automated content moderation | ❌ Not built | High at scale |

---

## Trust Roadmap

### Priority 1: Escrow / Payment Hold

**Problem:** With direct Stripe/Chapa payments, the seller receives money immediately. If the item is wrong, the buyer has no recourse after Stripe's dispute window.

**Solution:** Hold payment in escrow for 48–72 hours after delivery.

```
Buyer pays → Money held in platform escrow
                    ↓
           Seller ships + marks "Delivered"
                    ↓
    Buyer has 48h to open dispute or confirm receipt
                    ↓
    No dispute → Money released to seller wallet
    Dispute opened → Admin reviews → resolution
```

**Implementation:**
- Add `escrow_release_at` timestamp to orders
- BullMQ delayed job auto-releases after 48h if no dispute
- Requires NBE payment institution license

### Priority 2: CSAM Reporting Pipeline

**Legal obligation:** Any platform must report child sexual abuse material to authorities immediately.

**Implementation:**
```javascript
// When CSAM is detected or reported:
async function reportCSAM(contentId, reporterId, contentUrl) {
  // 1. Immediately remove content
  await pool.query('DELETE FROM posts WHERE id = $1', [contentId]);
  // 2. Ban the user
  await pool.query('UPDATE users SET is_banned = TRUE WHERE id = $1', [userId]);
  // 3. Send to NCMEC (US) CyberTipline API
  await fetch('https://report.cybertip.org/api/v1/report', { ... });
  // 4. Notify Ethiopian Federal Police
  await sendEmail('cybercrime@federalpolice.gov.et', ...);
  // 5. Log for legal records
}
```

### Priority 3: Automated Content Moderation

At scale, human review cannot keep up. Add AI moderation:

```javascript
// Image moderation — check on upload
const { data } = await openai.moderations.create({
  model: 'omni-moderation-latest',
  input: [{ type: 'image_url', image_url: { url: imageUrl } }]
});
if (data.results[0].flagged) {
  // Don't allow upload; log for review
}
```

**Text moderation:** Run user posts through OpenAI Moderation API before publishing.

**Cost:** ~$0.002 per moderation call — affordable at scale.

### Priority 4: Verified Buyer Badge

Give buyers a "Verified" status after:
- Completed 3+ orders with no disputes
- Phone number verified
- Real name on profile

Display on product detail page: "Bought by X verified users"

### Priority 5: COD Fraud Prevention

Problem: Buyers order via COD, seller delivers, buyer refuses to pay.

**Solutions:**
1. Require a small deposit (10–20%) upfront for COD orders over ETB 500
2. Limit COD availability to buyers with positive order history
3. Auto-flag buyers with 2+ cancelled/refused COD orders

---

## Dispute Resolution Process

### Step 1: In-Platform Resolution (Days 1–3)
- Buyer opens dispute in Orders page
- System notifies seller
- Both parties negotiate via chat with dispute context

### Step 2: Mediated Resolution (Days 4–7)
- If unresolved, admin mediates
- Admin can view both parties' order details, messages, photos
- Admin makes binding decision

### Step 3: Refund or Hold Release
- Admin issues refund from escrow (when built)
- Or approves seller's claim and releases payment

---

## Anti-Spam & Fake Account Prevention

### Registration
- Phone number or email verification required (OTP)
- Rate limit: max 3 registrations per IP per hour
- Google reCAPTCHA on registration form (future)

### Content
- New accounts (< 24h old) are limited to 5 posts/day
- Accounts with < 1 follower cannot DM users they don't follow
- Duplicate content detection (similar-hash check)

### Commerce
- New seller accounts cannot list more than 10 products until first order is completed
- Products priced < ETB 1 or > ETB 1,000,000 are flagged for review

---

## Trust Signals to Add to UI

These visual trust signals increase conversion rates:

```tsx
// On product detail page:
<div className="flex items-center gap-2 text-xs text-green-600">
  <Shield className="w-3.5 h-3.5" />
  <span>Buyer Protected · Secure Payment · 30-day Returns</span>
</div>

// On seller profile:
<div className="flex items-center gap-1.5">
  <CheckCircle className="w-3.5 h-3.5 text-green-500" />
  <span className="text-xs text-muted-foreground">
    Verified seller · Member since {joinDate} · {orderCount} completed orders
  </span>
</div>

// In checkout modal:
<div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 border border-green-200">
  <Lock className="w-4 h-4 text-green-600" />
  <p className="text-xs text-green-700">
    Your payment is secured by Chapa / Stripe. 
    ETB {amount} will be charged only when you confirm.
  </p>
</div>
```

---

## Transparency Report (Annual)

Once live, publish annually:
- Number of user reports received
- Number of accounts banned
- Number of law enforcement requests
- Number of content pieces removed
- By category: fraud, spam, CSAM, hate speech, etc.

This builds trust with users, regulators, and investors.
