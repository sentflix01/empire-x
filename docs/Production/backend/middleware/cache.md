# middleware/cache.ts - Redis HTTP Response Cache

## 1. What is this?

**HTTP middleware.** cacheMiddleware(prefix,ttl,{varyByUser,varyByQuery}): GET-only; X-Cache HIT/MISS headers.

## 2. Why does it exist?

cacheMiddleware(prefix,ttl,{varyByUser,varyByQuery}): GET-only; X-Cache HIT/MISS headers. varyByUser keys per-user AND switches Cache-Control to private - closed a real cross-user feed leak found in audit. invalidateCache(prefix) purges known variants after writes. Used by posts list + trending.

## 3. What does it do?

cacheMiddleware(prefix,ttl,{varyByUser,varyByQuery}): GET-only; X-Cache HIT/MISS headers. varyByUser keys per-user AND switches Cache-Control to private - closed a real cross-user feed leak found in audit. invalidateCache(prefix) purges known variants after writes. Used by posts list + trending.

## 4. What does it touch?

Inline references only — nothing external.
