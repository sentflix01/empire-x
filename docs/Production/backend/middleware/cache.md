# middleware/cache.ts - Redis HTTP Response Cache
cacheMiddleware(prefix,ttl,{varyByUser,varyByQuery}): GET-only; X-Cache HIT/MISS headers. varyByUser keys per-user AND switches Cache-Control to private - closed a real cross-user feed leak found in audit. invalidateCache(prefix) purges known variants after writes. Used by posts list + trending.
