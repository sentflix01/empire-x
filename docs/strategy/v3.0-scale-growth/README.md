# v3.0 — Scale & Growth

> **Theme:** Expansion
> **Goal:** Nodbusiness scales from Ethiopia to East Africa and beyond. The technical architecture handles 10× user growth without rewrite. New revenue streams are live. A native mobile app is available on the App Store and Play Store.

---

## Scope

| Section | File |
|---------|------|
| React Native mobile app | [audit.md](./mobile-app/audit.md) · [tasks.md](./mobile-app/tasks.md) |
| Multi-country expansion | [audit.md](./multi-country/audit.md) · [tasks.md](./multi-country/tasks.md) |
| Monetization features | [audit.md](./monetization/audit.md) · [tasks.md](./monetization/tasks.md) |
| Partner & external APIs | [audit.md](./partner-apis/audit.md) · [tasks.md](./partner-apis/tasks.md) |
| Microservices migration | [audit.md](./microservices/audit.md) · [tasks.md](./microservices/tasks.md) |
| Community groups | [audit.md](./community-groups/audit.md) · [tasks.md](./community-groups/tasks.md) |
| Live streaming | [audit.md](./live-streaming/audit.md) · [tasks.md](./live-streaming/tasks.md) |

---

## Success Criteria

**Mobile App**
- [ ] React Native app sharing business logic with web
- [ ] Available on Google Play Store (Ethiopia)
- [ ] Available on Apple App Store
- [ ] Push notifications via FCM (Android) + APNs (iOS)
- [ ] Native camera, photo library, location permissions

**Multi-Country**
- [ ] Kenyan Shilling (KES) + M-Pesa payment gateway
- [ ] Nigerian Naira (NGN) + Paystack integration
- [ ] Ugandan Shilling (UGX) + MTN Mobile Money
- [ ] Multi-currency wallet (hold ETB + KES + USD)
- [ ] Localized content per country

**Monetization**
- [ ] Promoted posts: paid boosting for businesses
- [ ] Subscription tiers: Free / Pro / Business
- [ ] Featured showroom placement (paid)
- [ ] Job posting fees for companies
- [ ] Course revenue share (70% instructor / 30% platform)

**Architecture**
- [ ] Notification service separated into standalone microservice
- [ ] Feed service separated (handles high read volume)
- [ ] PostgreSQL read replicas for analytics queries
- [ ] Redis Cluster for high availability
- [ ] CDN for all static + media assets

**Community & Live**
- [ ] Community groups: create, join, post within group
- [ ] Live streaming: go live from profile, viewers can comment + tip
- [ ] Virtual gifts on live streams

---

## Dependencies

- All previous versions (v1.0 through v2.3) completed
- Mobile: Expo or bare React Native, shared API layer
- Infrastructure: Render + Vercel + Supabase / AWS / GCP for production scale
- Legal: entity registration in target countries
