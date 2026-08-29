# Nodbusiness — Cookie Policy

> **Classification:** Confidential — Internal Use Only (Public when published)
> **Version:** 1.0
> **Effective Date:** [Date]
> **Last Updated:** August 2026

---

## Acronyms

| Acronym | Full Form |
|---------|-----------|
| API | Application Programming Interface |
| CDN | Content Delivery Network |
| CSRF | Cross-Site Request Forgery |
| GDPR | General Data Protection Regulation |
| PII | Personally Identifiable Information |
| SDK | Software Development Kit |

---

## 1. What Are Cookies

Cookies are small text files stored on your device (computer, phone, tablet) when you visit a website. They help websites remember your preferences, keep you logged in, understand how you use the site, and show relevant content.

**We use cookies and similar technologies** (localStorage, sessionStorage, IndexedDB, pixel tags) — collectively "Cookies" in this policy.

---

## 2. Cookie Categories

### 2.1 Essential (Strictly Necessary)
**No consent required** — required for the Platform to function.

| Cookie | Purpose | Duration | Domain |
|--------|---------|----------|--------|
| `session_id` | Authenticated session identifier | Session / 30 days | nodbusiness.app |
| `csrf_token` | CSRF protection for forms | Session | nodbusiness.app |
| `wallet_nonce` | Wallet operation nonce (anti-replay) | 1 hour | nodbusiness.app |
| `auth_refresh` | Refresh token rotation flag | 7 days | nodbusiness.app (HttpOnly) |
| `rate_limit_bucket` | Client-side rate limit tracking | 1 hour | nodbusiness.app |
| `feature_flags` | Cached feature flag state | 5 minutes | nodbusiness.app |

### 2.2 Preferences (Functional)
**Consent required** — remember your choices.

| Cookie | Purpose | Duration | Domain |
|--------|---------|----------|--------|
| `locale` | Language (en, am, etc.) | 1 year | nodbusiness.app |
| `theme` | Light/dark/system | 1 year | nodbusiness.app |
| `currency` | Preferred currency (ETB, USD, KES, etc.) | 1 year | nodbusiness.app |
| `timezone` | User timezone for timestamps | 1 year | nodbusiness.app |
| `sidebar_collapsed` | UI state persistence | 1 year | nodbusiness.app |
| `notification_sound` | Sound preference for notifications | 1 year | nodbusiness.app |

### 2.3 Analytics & Performance
**Consent required** — understand usage, improve Platform.

| Cookie | Purpose | Duration | Domain |
|--------|---------|----------|--------|
| `_ga` | Google Analytics client ID | 2 years | nodbusiness.app |
| `_ga_<container>` | GA4 session tracking | 2 years | nodbusiness.app |
| `_gid` | GA session ID | 24 hours | nodbusiness.app |
| `_gat` | GA throttle | 1 minute | nodbusiness.app |
| `nod_analytics_session` | Custom session ID for internal analytics | 30 minutes | nodbusiness.app |
| `nod_feature_usage` | Feature adoption tracking | 1 year | nodbusiness.app |
| `nod_perf_timing` | Core Web Vitals sampling | Session | nodbusiness.app |

### 2.4 Marketing & Personalization
**Consent required** — relevant content, attribution.

| Cookie | Purpose | Duration | Domain |
|--------|---------|----------|--------|
| `_fbp` | Meta (Facebook) Pixel client ID | 3 months | nodbusiness.app |
| `_gcl_au` | Google Ads conversion linker | 3 months | nodbusiness.app |
| `nod_attribution` | First-touch / last-touch attribution | 90 days | nodbusiness.app |
| `nod_personalization` | Content recommendations, feed ranking | 1 year | nodbusiness.app |
| `nod_ab_test_<exp>` | A/B test variant assignment | Experiment duration | nodbusiness.app |

---

## 3. Third-Party Cookies

| Provider | Purpose | Cookies | Consent Category |
|----------|---------|---------|------------------|
| **Stripe** | Payment processing (Elements, Link) | `__stripe_mid`, `__stripe_sid` | Essential |
| **Chapa** | Payment redirect/verification | Session only | Essential |
| **Flutterwave** | Payment processing | Session only | Essential |
| **Google Maps** | Map embed in showrooms | `NID`, `CONSENT` | Preferences |
| **Firebase (FCM)** | Push notifications | `FCM_TOKEN` | Preferences |
| **Cloudflare** | Bot management, CDN | `__cf_bm`, `cf_clearance` | Essential |

**We do not allow** third-party advertising networks to set cookies on our Platform for cross-site tracking.

---

## 4. Local Storage & Similar Technologies

| Technology | Purpose | Cleared |
|------------|---------|---------|
| **localStorage** | Draft showrooms, cart, offline queue, feature flag cache | On logout / manual clear |
| **sessionStorage** | Temporary UI state, wizard steps, form drafts | Tab close |
| **IndexedDB** | Offline message queue, draft posts, image cache | Manual clear / quota |
| **Service Worker Cache** | PWA offline assets, fallback pages | Service worker update |

**These are not cookies** but serve similar purposes. Cleared via browser settings or our "Clear Data" button in Privacy settings.

---

## 5. Cookie Consent Management

### 5.1 Consent Banner
- **Shown:** First visit, after policy changes, when consent expires
- **Options:** Accept All, Reject All, Customize (per category)
- **Granular:** Toggle per category (Essential always on)
- **Record:** Consent logged with timestamp, IP hash, user agent, version

### 5.2 Managing Consent
- **Dashboard:** Settings → Privacy → Cookies (toggle per category)
- **Reject All:** Only Essential cookies set
- **Withdraw:** Anytime via dashboard or "Cookie Settings" link in footer
- **Effect:** Non-essential cookies removed on next page load

### 5.3 Consent Records
| Field | Stored |
|-------|--------|
| `consent_id` | UUID |
| `user_id` | UUID (or anonymous ID) |
| `categories` | JSON array of accepted categories |
| `version` | Policy version |
| `timestamp` | ISO 8601 UTC |
| `ip_hash` | SHA-256(IP + salt) |
| `user_agent` | Browser string |

---

## 6. Cookie Duration

| Category | Max Duration | Renewal |
|----------|--------------|---------|
| **Essential** | Session to 30 days | Auto on activity |
| **Preferences** | 13 months | On revisit |
| **Analytics** | 13 months (GA: 2 years) | On revisit |
| **Marketing** | 13 months | On revisit |
| **Third-Party** | Per provider (max 13 months) | Per provider |

**Session cookies** expire on browser close. **Persistent cookies** expire per above.

---

## 7. Your Rights

| Right | Cookies |
|-------|---------|
| **Withdraw Consent** | Anytime via dashboard → Privacy → Cookies |
| **Delete Cookies** | Browser settings → Clear site data; or our "Clear All Data" button |
| **Block Cookies** | Browser settings (may break Essential functions) |
| **Access Logs** | Request via privacy@nodbusiness.app |

---

## 8. Changes to This Policy

- **Material changes:** 30 days notice via email + dashboard banner
- **Version history:** Maintained at bottom of this document
- **Continued use** after effective date = acceptance

---

## 9. Contact

**Nodbusiness Technologies PLC**  
[Address, Addis Ababa, Ethiopia]  
**Privacy Email:** privacy@nodbusiness.app  
**DPO Email:** dpo@nodbusiness.app  

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | [Date] | Initial release |

---

*Confidential. For Nodbusiness Technologies internal use only.*