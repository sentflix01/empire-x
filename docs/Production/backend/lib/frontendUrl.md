# lib/frontendUrl.ts - Trusted Frontend URL Resolver
Reads comma-separated FRONTEND_URL, returns first valid origin - used for email links, OAuth redirects, Stripe success/cancel URLs, Chapa return_url. One source of truth shared by CORS config and payments.
