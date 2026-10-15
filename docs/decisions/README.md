# Nodbusiness — Engineering Decisions Index

> This folder documents every design decision made during spec development.
> Every question that arose, every option considered, and every choice made — recorded here.
> If you need to understand *why* something was built a certain way, start here.

---

## Acronyms Used in This Document

| Acronym | Full Form |
|---------|-----------|
| ADR | Architecture Decision Record |
| API | Application Programming Interface |
| SSRF | Server-Side Request Forgery |
| PBT | Property-Based Testing |
| TTL | Time to Live — cache expiry duration |
| CORS | Cross-Origin Resource Sharing |
| OTP | One-Time Password |
| JWT | JSON Web Token |
| AES | Advanced Encryption Standard |
| GCM | Galois/Counter Mode — an AES encryption mode |
| CRUD | Create, Read, Update, Delete |
| COD | Cash on Delivery |

---

## What This Folder Contains

| File | Feature | Type | Decisions |
|------|---------|------|-----------|
| [showroom-external-api-decisions.md](./showroom-external-api-decisions.md) | Showroom External API Integration | Feature spec | 20 decisions covering SSRF, encryption, caching, rate limiting, field mapping, health monitoring |
| [showroom-external-api-implementation.md](./showroom-external-api-implementation.md) | Showroom External API | Implementation reference | Full task-by-task implementation notes for all 18 tasks |
| [product-reviews-decisions.md](./product-reviews-decisions.md) | Product Reviews Bugfix | Bugfix spec | 10 decisions covering component design, state management, testing approach |
| [gap-fixes-decisions.md](./gap-fixes-decisions.md) | Application-Wide Gap Fixes | Bugfix spec | 13 decisions covering migration bugs, route bugs, CORS, auth, wallet |
| [account-deletion-decisions.md](./account-deletion-decisions.md) | Account Deletion and Data Export | Owner decision (2026-10-15) | Anonymize instead of delete, keep financial records, guards, export contents |

---

## How to Read Decision Files

Each decision entry follows this structure:

```
Decision X.Y — Short title
  Question:    What was being decided
  Context:     Which requirement or AC raised it
  Options:     Realistic alternatives at the time
  Decision:    What was chosen (marked ✅)
  Rationale:   Why it won
  Impact:      Which ACs or tasks were affected
```

---

## Key Cross-Cutting Decisions Summary

### Security
- All URL validation failures return **HTTP 422** — uniform across all endpoints
- SSRF validation runs at **both save time and fetch time** — not just once
- API credentials use **AES-256-GCM** encryption at rest — plaintext never returned to any client

### Error Handling
- When `updateRecord` returns `null` (zero rows matched), callers return **HTTP 404**, not `HTTP 200 null`
- When field mapping fails at proxy time, the gateway returns an error — **never unmapped raw data**

### Caching & Rate Limiting
- Minimum TTL is **1 second** (enforced at DB level); UI enforces a minimum of 1 minute
- Rate limiter falls back to **in-memory counters** when Redis is unavailable — it never bypasses rate limiting

### Frontend Auth
- `AuthProvider` **wraps** `CartProvider` so cart fetches always fire after auth resolves
- `AppLayout` uses `useAuth()` context — it does not call `auth.me()` directly

---

## Adding New Decisions

When a significant technical decision is made during a spec:

1. Create a file named `{feature-name}-decisions.md` in this folder
2. Follow the format above
3. Add an entry to the table in this README
4. Reference it from the spec's `design.md` or `requirements.md`

---

*This folder is the institutional memory of Nodbusiness's engineering decisions.*
*Without it, the same questions get answered differently each time.*
