# lib/sentry.ts - Error Tracking (Sentry)

## 1. What is this?

**Shared frontend library.** Initializes @sentry/node when SENTRY_DSN is set and registers an Express handler BEFORE all routes so errors carry request context.

## 2. Why does it exist?

Initializes @sentry/node when SENTRY_DSN is set and registers an Express handler BEFORE all routes so errors carry request context. On SDK v10 the legacy error-handler export returns null - coverage relies on that early handler plus lib/errorCollector. No DSN = silent no-op. Connects: index.ts.

## 3. What does it do?

Initializes @sentry/node when SENTRY_DSN is set and registers an Express handler BEFORE all routes so errors carry request context. On SDK v10 the legacy error-handler export returns null - coverage relies on that early handler plus lib/errorCollector. No DSN = silent no-op. Connects: index.ts.

## 4. What does it touch?

Inline references only — nothing external.
