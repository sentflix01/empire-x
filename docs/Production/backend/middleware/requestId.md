# middleware/requestId.ts - Request Correlation IDs

## 1. What is this?

**HTTP middleware.** Accepts inbound X-Request-ID or mints a uuid, stamps req.requestId, echoes header.

## 2. Why does it exist?

Accepts inbound X-Request-ID or mints a uuid, stamps req.requestId, echoes header. apiError bodies embed it so support can grep Sentry/logs for one exact request.

## 3. What does it do?

Accepts inbound X-Request-ID or mints a uuid, stamps req.requestId, echoes header. apiError bodies embed it so support can grep Sentry/logs for one exact request.

## 4. What does it touch?

Inline references only — nothing external.
