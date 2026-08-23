# lib/sentry.ts - Error Tracking (Sentry)
Initializes @sentry/node when SENTRY_DSN is set and registers an Express handler BEFORE all routes so errors carry request context. On SDK v10 the legacy error-handler export returns null - coverage relies on that early handler plus lib/errorCollector. No DSN = silent no-op. Connects: index.ts.
