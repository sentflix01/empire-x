# backend/lib/redis.ts — Redis Connection & No-Op Fallback
> Central Redis client. If Redis is not configured, everything keeps working
> through a built-in "no-op" client instead of crashing.

## Purpose
Single place that decides how the platform talks to Upstash/Redis and what happens when it cannot.
## What It Does
- Reads `REDIS_URL`; creates an ioredis connection (TLS when `rediss://`, retry strategy tuned).
- If no URL: returns a **no-op client** (`isNoOp = true`) whose commands resolve harmlessly - feature flags fall back to defaults, revocation checks fail-open, rate limiters skip.
- Exposes `closeRedis()` used by graceful shutdown.
## Key Exports
| Export | Use |
|---|---|
| `getRedis()` | Returns ioredis OR no-op; callers check `isNoOp` |
| type `AnyRedis` | Union type for call sites |
## Connects To
featureFlags (flag overrides), middleware/auth (revocation lists), rateLimiter, cache.ts, socket adapter, proxyGateway caches.
## Data & Security
Keys used: `revoked:{jti}`, `revoke_before:{userId}`, `user:{id}` cache (60s),
`ff:*` flags, `cache:*` HTTP cache, `proxy:*` section cache, `followers:*`.
TLS `rejectUnauthorized:false` is a known gap - TD-016.
