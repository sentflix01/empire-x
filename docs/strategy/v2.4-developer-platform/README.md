# v2.4 — Developer Platform

> **Theme:** Open Infrastructure
> **Goal:** Any developer anywhere in the world can build on Halehame in under
> 30 minutes. Halehame becomes a platform, not just an app.
>
> This is the version that takes Halehame from "a good app for Ethiopia"
> to "global infrastructure that anyone can build on."

---

## The Core Principle

> Everything the Halehame app can do, the API can do.
> Everything the API can do, a developer can automate.
> Everything a developer can automate, a business can scale.

---

## Scope

| Section | File |
|---------|------|
| API Key System | [audit.md](./api-keys/audit.md) · [tasks.md](./api-keys/tasks.md) |
| Webhook System | [audit.md](./webhooks/audit.md) · [tasks.md](./webhooks/tasks.md) |
| OAuth 2.0 (Login with Halehame) | [audit.md](./oauth/audit.md) · [tasks.md](./oauth/tasks.md) |
| Embed Widget | [audit.md](./embed-widget/audit.md) · [tasks.md](./embed-widget/tasks.md) |
| Developer Dashboard | [audit.md](./dev-dashboard/audit.md) · [tasks.md](./dev-dashboard/tasks.md) |
| API Documentation | [audit.md](./api-docs/audit.md) · [tasks.md](./api-docs/tasks.md) |
| Integration Marketplace | [audit.md](./integration-marketplace/audit.md) · [tasks.md](./integration-marketplace/tasks.md) |

---

## Success Criteria

- [ ] Developer can get an API key in < 2 minutes from the dashboard
- [ ] All 42+ API routes accept API key Bearer token (not just user JWT)
- [ ] Any system can subscribe to Halehame events via webhooks
- [ ] "Login with Halehame" button works on any external website
- [ ] Showroom embeds on any website with one line of code
- [ ] Developer dashboard shows: key usage, webhook logs, rate limit status
- [ ] API documentation covers every endpoint with examples
- [ ] At least 5 integration templates available (Shopify, WhatsApp, etc.)
- [ ] Revenue sharing program documented and implemented

---

## Key Metrics (Platform Health KPIs)

| Metric | Target |
|--------|--------|
| Registered developer apps | 100+ in first 6 months |
| Active API keys | 50+ using API weekly |
| Webhooks configured | 200+ active subscriptions |
| "Login with Halehame" integrations | 20+ external sites |
| Integration marketplace listings | 30+ |

---

## Why This Version Changes Everything

Without v2.4, Halehame is a feature — one of many apps competing for users.

With v2.4, Halehame is infrastructure — every business that integrates Halehame
brings their existing users with them. Every developer who builds on Halehame
creates a reason for more users to join.

This is the Telegram flywheel:
```
Great product → developers build on it → more features exist →
more users come → more developers come → platform becomes essential
```

---

## Dependencies

- All v1.x versions complete (core product must be stable before opening to developers)
- `app_settings` table (migration 29 — done ✅)
- New tables: `api_keys`, `webhook_subscriptions`, `oauth_apps`, `oauth_tokens`
- Backend: API key middleware, webhook event emitter, OAuth 2.0 server
- Frontend: Developer dashboard at `/developers`

---

## Estimated Effort

Large — 3–4 weeks of focused backend + frontend work.
The OAuth 2.0 server alone is 1 week.
This is the most impactful single version in the roadmap.
