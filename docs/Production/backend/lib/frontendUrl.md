# lib/frontendUrl.ts - Trusted Frontend URL Resolver

## 1. What is this?

**Shared frontend library.** Reads comma-separated FRONTEND_URL, returns first valid origin - used for email links, OAuth redirects, Stripe success/cancel URLs, Chapa return_url.

## 2. Why does it exist?

Reads comma-separated FRONTEND_URL, returns first valid origin - used for email links, OAuth redirects, Stripe success/cancel URLs, Chapa return_url. One source of truth shared by CORS config and payments.

## 3. What does it do?

Reads comma-separated FRONTEND_URL, returns first valid origin - used for email links, OAuth redirects, Stripe success/cancel URLs, Chapa return_url. One source of truth shared by CORS config and payments.

## 4. What does it touch?

Inline references only — nothing external.
