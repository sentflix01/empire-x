# Nodbusiness — API Versioning Strategy

> How we evolve the API without breaking clients.
> Last updated: August 2026

---

## Acronyms Used in This Document

| Acronym | Full Form |
|---------|-----------|
| API | Application Programming Interface |
| URL | Uniform Resource Locator |
| HTTP | HyperText Transfer Protocol |
| REST | Representational State Transfer |
| SLA | Service Level Agreement |
| SDK | Software Development Kit |
| CI/CD | Continuous Integration / Continuous Delivery |
| CDN | Content Delivery Network |
| UI | User Interface |

---

## Current State

All API endpoints are under `/api/` with no explicit version prefix.
Every response includes an `API-Version: 1` header.

---

## Versioning Strategy: URL Path Versioning

When breaking changes are needed, introduce a new version:
```
/api/v1/products  ← new version
/api/products     ← legacy (maintained for backward compatibility)
```

### When to version

Create a new API version when:
- A field is removed from a response
- A field type changes (string → number)
- A required field is added to a request
- An endpoint is renamed or moved
- Authentication requirements change

Do NOT version for:
- Adding new optional fields to responses
- Adding new optional request parameters
- New endpoints
- Bug fixes

---

## Versioning in Code

```javascript
// backend/middleware/apiVersion.js
// Current: sets API-Version header on all responses

// Future: route-level versioning
app.use('/api/v2', require('./routes/v2'));
app.use('/api', require('./routes/v1')); // legacy
```

---

## Mobile App Considerations

When a mobile app (React Native) is built:
- The app version must be stored: `User-Agent: nodbusiness-iOS/2.1.0`
- The API must support at least 2 previous major versions
- Deprecation warning: `Deprecation: sunset=2027-01-01` header
- Force-upgrade mechanism for security-critical versions

---

## Changelog Format

Every API change must be documented:

```markdown
## API Changelog

### v1.2.0 (August 2026)
**New endpoints:**
- `GET /api/orders/session/:sessionId` — fetch orders by Stripe session
- `POST /api/messages/:id/forward` — forward message to another conversation
- `POST /api/admin/users/:id/ban` — ban a user
- `POST /api/admin/users/:id/unban` — unban a user
- `GET /api/admin/stats/revenue` — revenue chart + top sellers

**Modified endpoints:**
- `GET /api/admin/stats` — adds `revenue_total`, `revenue_last_30d`, `orders_paid`, 
  `orders_pending`, `new_users_today`, `banned_users` fields
- `GET /api/posts` — adds `following=true` filter
- `POST /api/orders/checkout/session` — `success_url` now points to `/orders/success`
- `POST /api/coupons/:id/toggle` — new endpoint to activate/pause coupon

### v1.1.0 (July 2026)
- `parent_id` added to comments (threaded replies)
- `is_banned`, `ban_reason`, `banned_at` added to users

### v1.0.0 (Initial release)
- Core auth, profiles, feed, marketplace, orders, messaging
```
