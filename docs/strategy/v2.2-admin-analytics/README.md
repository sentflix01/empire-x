# v2.2 — Admin & Analytics

> **Theme:** Platform Health
> **Goal:** The admin panel gives operators full visibility and control over the platform. Sellers have rich analytics to grow their business. The platform self-regulates through efficient moderation tools.

---

## Scope

| Section | File |
|---------|------|
| Admin dashboard | [audit.md](./admin-dashboard/audit.md) · [tasks.md](./admin-dashboard/tasks.md) |
| User management | [audit.md](./user-management/audit.md) · [tasks.md](./user-management/tasks.md) |
| Content moderation | [audit.md](./content-moderation/audit.md) · [tasks.md](./content-moderation/tasks.md) |
| Revenue & commission | [audit.md](./revenue/audit.md) · [tasks.md](./revenue/tasks.md) |
| Feature flags UI | [audit.md](./feature-flags/audit.md) · [tasks.md](./feature-flags/tasks.md) |
| Seller analytics | [audit.md](./seller-analytics/audit.md) · [tasks.md](./seller-analytics/tasks.md) |
| Platform metrics | [audit.md](./platform-metrics/audit.md) · [tasks.md](./platform-metrics/tasks.md) |

---

## Success Criteria

**Admin Panel**
- [ ] Dashboard: DAU/MAU, new signups, revenue, active orders, open reports
- [ ] User management: search, filter by role, ban/unban with reason, view profile
- [ ] Content moderation queue: reported posts/products sorted by severity
- [ ] One-click approve/dismiss/delete for moderation items
- [ ] Revenue chart: daily/weekly/monthly, breakdown by commission + fees
- [ ] Feature flags: toggle any flag on/off from UI (no redeploy required)
- [ ] Devops view: server health, DB pool, Redis status, queue status

**Seller Analytics**
- [ ] Showroom: views, unique visitors, top sections, traffic sources
- [ ] Products: views per product, add-to-cart rate, purchase rate
- [ ] Orders: total orders, revenue, average order value, return rate
- [ ] Customers: new vs. returning, geographic distribution
- [ ] All charts: line graph for trends, bar chart for comparison
- [ ] Export data as CSV

**Platform Metrics (internal)**
- [ ] Real-time active users (WebSocket connections)
- [ ] Queue health: pending jobs, failed jobs, processing time
- [ ] Error rate from Sentry: trend over time

---

## Dependencies

- Backend: admin, moderation, devops routes (exist), commission route (exists)
- Frontend: Recharts (already installed), admin layout
- Backend: seller analytics queries (may need new endpoints)
