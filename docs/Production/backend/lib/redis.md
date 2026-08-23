# backend/lib/redis.ts — Redis Connection & No-Op Fallback

## 1. What is this?

**Shared frontend library.** Central Redis client. If Redis is not configured, everything keeps working

## 2. Why does it exist?

Single place that decides how the platform talks to Upstash/Redis and what happens when it cannot.

## 3. What does it do?

- Reads `REDIS_URL`; creates an ioredis connection (TLS when `rediss://`, retry strategy tuned).
- If no URL: returns a **no-op client** (`isNoOp = true`) whose commands resolve harmlessly - feature flags fall back to defaults, revocation checks fail-open, rate limiters skip.
- Exposes `closeRedis()` used by graceful shutdown.

| Export | Use |
|---|---|
| `getRedis()` | Returns ioredis OR no-op; callers check `isNoOp` |
| type `AnyRedis` | Union type for call sites |

## 4. What does it touch?

**Connections:**
featureFlags (flag overrides), middleware/auth (revocation lists), rateLimiter, cache.ts, socket adapter, proxyGateway caches.

**Safety / data notes:**
Keys used: `revoked:{jti}`, `revoke_before:{userId}`, `user:{id}` cache (60s),
`ff:*` flags, `cache:*` HTTP cache, `proxy:*` section cache, `followers:*`.
TLS `rejectUnauthorized:false` is a known gap - TD-016.
