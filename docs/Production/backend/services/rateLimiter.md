# services/rateLimiter.ts - Per-Tenant Section Quota
Fixed window keyed ip+showroomId+sectionKey via Redis INCR+EXPIRE (default 1 req/60s). Contract: never block on Redis trouble - memory fallback, then fail-open. Property-tested. Only consumer: proxyGateway (global API limiting lives in index.ts).
