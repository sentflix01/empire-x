# middleware/requestId.ts - Request Correlation IDs
Accepts inbound X-Request-ID or mints a uuid, stamps req.requestId, echoes header. apiError bodies embed it so support can grep Sentry/logs for one exact request.
