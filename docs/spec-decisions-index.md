# Spec Decisions Index

This folder documents every design question that arose during requirements analysis for each
feature/bugfix spec, along with the choices that were made. The goal is to give any developer
a clear record of **what was decided, why, and what the alternatives were** — so future
changes are made with full context.

---

## Specs Covered

| File | Spec | Type |
|------|------|------|
| [showroom-external-api-decisions.md](./showroom-external-api-decisions.md) | Showroom External API Integration | Feature |
| [product-reviews-decisions.md](./product-reviews-decisions.md) | Product Reviews Bugfix | Bugfix |
| [gap-fixes-decisions.md](./gap-fixes-decisions.md) | Application-Wide Gap Fixes | Bugfix |

---

## How to Read These Files

Each decision entry follows this structure:

- **Question** — the ambiguity or design choice that needed resolving
- **Context** — which requirement or acceptance criterion raised it
- **Options Considered** — the realistic choices at the time
- **Decision Made** — what was chosen
- **Rationale** — why that option won
- **Impact** — which acceptance criteria or implementation tasks were affected

---

## Summary of Key Cross-Cutting Decisions

### Security
- All URL validation failures return **HTTP 422** (uniform across the system — no mixed 4xx codes for validation).
- SSRF validation runs at **both save time and fetch time** — not just once.
- API keys use **AES-256-GCM** encryption at rest; plaintext credentials are never returned to any client.

### Error Handling
- When `updateRecord` returns `null` (zero rows matched), callers return **HTTP 404**, not `HTTP 200 null`.
- When field mapping fails at proxy time, the gateway returns an error — **never unmapped raw data**.

### Caching & Rate Limiting
- Minimum TTL is **1 second** (enforced at DB level); the UI enforces a minimum of 1 minute.
- Rate limiter falls back to **in-memory counters** when Redis is unavailable — it does not bypass rate limiting.

### Frontend Auth
- `AuthProvider` **wraps** `CartProvider` so cart fetches always fire after auth resolves.
- `AppLayout` uses `useAuth()` context — it does not call `auth.me()` directly.
