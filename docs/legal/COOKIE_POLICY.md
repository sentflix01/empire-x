# Nodbusiness — Cookie Policy

> What cookies and local storage we use and why.
> **Last updated:** August 2026

---

## Summary

Nodbusiness uses minimal tracking. We use cookies and browser storage **only to make the app work** — not to track you across the internet or sell your data.

---

## What We Use

### 1. Authentication Cookie (`access_token`)

| Property | Value |
|---|---|
| **Purpose** | Keeps you logged in |
| **Type** | Session cookie (currently in localStorage; HttpOnly cookie migration planned) |
| **Duration** | 7 days |
| **Third-party?** | No — Nodbusiness only |
| **Required?** | Yes — app cannot function without it |

```
Current: localStorage.setItem('access_token', jwt)
Planned: Set-Cookie: access_token=jwt; HttpOnly; Secure; SameSite=Strict; Max-Age=604800
```

### 2. Theme Preference

| Property | Value |
|---|---|
| **Purpose** | Remember your dark/light mode choice |
| **Type** | localStorage |
| **Duration** | Permanent until cleared |
| **Third-party?** | No |
| **Required?** | No — defaults to light mode |

### 3. Tab Order Preference (Chat)

| Property | Value |
|---|---|
| **Purpose** | Remember your chat tab order (Contacts/All/Groups/Channels) |
| **Type** | localStorage (`empire_chat_tab_order`) |
| **Duration** | Permanent until cleared |
| **Third-party?** | No |
| **Required?** | No |

### 4. Announcement Ticker (Dismissed)

| Property | Value |
|---|---|
| **Purpose** | Remember that you dismissed the company announcement banner |
| **Type** | localStorage (`empire_company_ticker_hidden`) |
| **Duration** | Until localStorage is cleared |
| **Third-party?** | No |
| **Required?** | No |

### 5. Draft Builder State

| Property | Value |
|---|---|
| **Purpose** | Save your showroom builder progress so you don't lose work |
| **Type** | localStorage (`empire_builder_draft`) |
| **Duration** | Until you clear or publish |
| **Third-party?** | No |
| **Required?** | No — but without it you lose unsaved work |

---

## Third-Party Cookies

| Service | Purpose | Can you opt out? |
|---|---|---|
| **Stripe** | Payment processing (only on checkout pages) | You can avoid by not using Stripe checkout |
| **Google OAuth** | Sign in with Google (only if you use Google login) | You can register with email instead |
| **Sentry** | Error tracking (no PII, no cross-site tracking) | Cannot opt out while using app |
| **Vercel** | Preview deployment authentication | Not set in production |

**We do NOT use:** Google Analytics, Facebook Pixel, TikTok Pixel, or any advertising tracking cookies.

---

## How to Clear

**In your browser:**
- Chrome: Settings → Privacy and Security → Clear browsing data → Cookies
- Firefox: Settings → Privacy & Security → Clear Data → Cookies
- Safari: Settings → Safari → Clear History and Website Data

**Effect:** You will be logged out of Nodbusiness and all preferences reset.

**In the Nodbusiness app:**
- Account Settings → Privacy → Clear local data (planned feature)

---

## GDPR / Cookie Consent

For users in the European Union, we will display a cookie consent banner that allows you to:
- Accept all (including Stripe/Google analytics if applicable)
- Reject non-essential cookies
- See a detailed breakdown of each cookie

This banner is not yet implemented but is required before serving EU users.

---

## Changes

We will notify you of changes to this Cookie Policy via in-app notification with 30 days' notice.

**Contact:** privacy@nodbusiness.app
