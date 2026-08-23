# Nodbusiness — Feature Flags & Rollout Strategy

> How Nodbusiness ships features safely: the real flag registry, how evaluation works, and the
> rollout rules every engineer follows.
> **This page is generated against `backend/lib/featureFlags.ts` — the code is the source of
> truth. Update this doc in the same PR that changes `DEFAULT_FLAGS`.**
> Last updated: 2026-08-23

---

## Acronyms Used in This Document

| Acronym | Full Form |
|---------|-----------|
| A/B | A/B testing — comparing two variants to measure which performs better |
| API | Application Programming Interface |
| SDK | Software Development Kit |

---

## 1. How the flag system works (actual implementation)

Priority order — highest wins:

1. **Environment variable** `FF_<FLAG_NAME>` (`true` / `1` → on; anything else → off)
2. **Redis** key `ff:<flag_name>` holding a JSON `{enabled, rollout}` payload — lets admins flip flags live without a redeploy (`setFlag()`)
3. **Hardcoded defaults** in `DEFAULT_FLAGS` (`backend/lib/featureFlags.ts`)

Evaluation semantics:

- `enabled: false` → always off.
- `rollout: 100` → on for everyone.
- Otherwise → deterministic per-user hash of `userId % 100 < rollout`, so a user's assignment never flips between requests.

API: `isEnabled(flagName, userId?)`. There is no PostgreSQL table and no frontend flag SDK;
the frontend consumes flags through `/api/flags` when needed.

**Emergency kill switch:** set the Redis key via `setFlag(name, false)` (or `redis-cli SET ff:<name> '<{"enabled":false,"rollout":0}>' EX 3600`). This takes effect immediately with no redeploy.
Changing an `FF_*` env var on Railway triggers a redeploy — it is *not* the fast path.

---

## 2. Flag registry (matches `DEFAULT_FLAGS` exactly)

### Payments
| Flag | Default | Description |
|------|---------|-------------|
| `stripe_payments` | ✅ on (100%) | Stripe hosted checkout (automatic payment methods) |
| `chapa_payments` | ❌ off | Chapa local payment integration (ETH) |

### AI
| Flag | Default | Description |
|------|---------|-------------|
| `ai_description_gen` | ✅ on (100%) | AI product description generator |
| `ai_chat` | ✅ on (100%) | AI chat assistant |

### Commerce & logistics
| Flag | Default | Description |
|------|---------|-------------|
| `delivery_tracking` | ✅ on (100%) | Delivery timeline tracking |
| `return_requests` | ✅ on (100%) | Return and refund requests |
| `invoice_generator` | ✅ on (100%) | PDF invoice generation |
| `low_stock_alerts` | ✅ on (100%) | Low-stock alerts for sellers |
| `nearby_product_search` | ✅ on (100%) | Product/shop search on Nearby map |
| `promoted_posts` | ❌ off | Promoted posts / ads system |

### Social & discovery
| Flag | Default | Description |
|------|---------|-------------|
| `personalized_feed` | ❌ off | Ranked feed algorithm instead of chronological |
| `map_clustering` | ✅ on (100%) | Map pin clustering |
| `profile_peek` | ✅ on (100%) | Profile peek modal on map markers |
| `swipe_feed` | ❌ off | TikTok-style swipe feed |
| `community_groups` | ❌ off | Community groups feature |

### Media & engagement
| Flag | Default | Description |
|------|---------|-------------|
| `video_posts` | ❌ off | Allow video uploads in posts |
| `virtual_gifts` | ❌ off | Virtual gifting on posts |
| `live_streaming` | ❌ off | Live streaming via Agora/LiveKit |

### Account & platform
| Flag | Default | Description |
|------|---------|-------------|
| `two_factor_auth` | ❌ off | TOTP two-factor authentication |
| `business_hours` | ❌ off | Business hours and appointment booking |

---

## 3. Rollout rules (engineering standard)

1. New features ship with the flag defaulting to **off** and registered in `DEFAULT_FLAGS`.
2. Rollout ladder: internal → 1% → 10% → 50% → 100%. Spend at least one day at each step and watch the error feed (`/admin/devops`) between steps.
3. Every flag has a documented owner. A flag at 100% for two consecutive releases gets its check removed (flag-cleanup PR).
4. Flags are not A/B tests: they gate availability; experiments need assignment + measurement (see `product/A_B_TESTING.md`).
5. Changing a flag's default or adding/removing a flag requires updating §2 of this document in the same PR.

---

## 4. Related documents

- `product/A_B_TESTING.md` — experiment design and statistics
- `backend/lib/featureFlags.ts` — implementation
- `operations/ENVIRONMENT_VARIABLES.md` — `FF_*` overrides
