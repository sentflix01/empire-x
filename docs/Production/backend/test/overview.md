# backend/test - Test Suite Overview (18 suites / 260 tests)

## 1. What is this?

**Test suite documentation.** Jest via ts-jest (`npx jest --runInBand`).

## 2. Why does it exist?

Jest via ts-jest (`npx jest --runInBand`). Unit+property suites: stripe (webhook idempotency, refunds, multi-seller cart), ssrfValidator+ssrf.pbt, rateLimiter(+pbt), proxyGateway.pbt, proxyResilience (Patent 4 stale fallback), credentialEncryption(+encryption.pbt AES-GCM roundtrip), fieldMapper(+pbt), healthStatus.pbt, ownership.pbt, ttl.pbt, responseTime. Integration: auth/orders/wallet (supertest over mocked pool). Excluded-from-jest live-server e2e scripts exist separately (e2e.test.js etc.). Frontend Playwright suite: frontend-next/e2e.

## 3. What does it do?

Jest via ts-jest (`npx jest --runInBand`). Unit+property suites: stripe (webhook idempotency, refunds, multi-seller cart), ssrfValidator+ssrf.pbt, rateLimiter(+pbt), proxyGateway.pbt, proxyResilience (Patent 4 stale fallback), credentialEncryption(+encryption.pbt AES-GCM roundtrip), fieldMapper(+pbt), healthStatus.pbt, ownership.pbt, ttl.pbt, responseTime. Integration: auth/orders/wallet (supertest over mocked pool). Excluded-from-jest live-server e2e scripts exist separately (e2e.test.js etc.). Frontend Playwright suite: frontend-next/e2e.

## 4. What does it touch?

Inline references only — nothing external.
