# services/rateLimiter.ts - Per-Tenant Section Quota

## 1. What is this?

**Backend service.** Fixed window keyed ip+showroomId+sectionKey via Redis INCR+EXPIRE (default 1 req/60s).

## 2. Why does it exist?

Fixed window keyed ip+showroomId+sectionKey via Redis INCR+EXPIRE (default 1 req/60s). Contract: never block on Redis trouble - memory fallback, then fail-open. Property-tested. Only consumer: proxyGateway (global API limiting lives in index.ts).

## 3. What does it do?

Fixed window keyed ip+showroomId+sectionKey via Redis INCR+EXPIRE (default 1 req/60s). Contract: never block on Redis trouble - memory fallback, then fail-open. Property-tested. Only consumer: proxyGateway (global API limiting lives in index.ts).

## 4. What does it touch?

Inline references only — nothing external.
