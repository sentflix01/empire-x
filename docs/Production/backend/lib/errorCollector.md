# lib/errorCollector.ts - Central Error Capture + DevOps Feed

## 1. What is this?

**Shared frontend library.** captureError() writes/increments rows in error_events (MD5 fingerprint dedupes repeats within 24h) powering the /admin/devops Live Errors tab.

## 2. Why does it exist?

captureError() writes/increments rows in error_events (MD5 fingerprint dedupes repeats within 24h) powering the /admin/devops Live Errors tab. errorMiddleware = global Express handler: records, maps LIMIT_FILE_SIZE to 413, returns GENERIC text for 5xx (no internals leak). Also THE process handlers: headers-sent noise is ignored; anything else flushes telemetry then exits. Idempotent install - index.ts adds none of its own.

## 3. What does it do?

captureError() writes/increments rows in error_events (MD5 fingerprint dedupes repeats within 24h) powering the /admin/devops Live Errors tab. errorMiddleware = global Express handler: records, maps LIMIT_FILE_SIZE to 413, returns GENERIC text for 5xx (no internals leak). Also THE process handlers: headers-sent noise is ignored; anything else flushes telemetry then exits. Idempotent install - index.ts adds none of its own.

## 4. What does it touch?

Inline references only — nothing external.
