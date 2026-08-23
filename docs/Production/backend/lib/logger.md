# backend/lib/logger.ts — Structured Logging (Pino)
> Every log line the platform emits, as fast JSON via Pino.

## Purpose
One logging object for the whole backend: structured fields, redaction-safe,
pretty-printed locally, machine-parseable in production.
## What It Does
- Exports `logger` (pino instance) with standard child bindings (service name, env).
- Development uses pino-pretty for readable colored output; production emits raw JSON lines to stdout (Railway log console).
## Key Exports
| Export | Use |
|---|---|
| `logger` | `logger.info({...}, msg)` / `.warn` / `.error` / `.debug` |
## Connects To
Imported by nearly every backend module. Railway retains logs ~30 days.
## Data & Security
Never log passwords, JWTs, full request bodies with credentials, connection
strings, or API keys (ENGINEERING_STANDARDS.md rule). httpLogger middleware
feeds request logs through this.
