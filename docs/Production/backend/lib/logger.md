# backend/lib/logger.ts — Structured Logging (Pino)

## 1. What is this?

**Shared frontend library.** Every log line the platform emits, as fast JSON via Pino.

## 2. Why does it exist?

One logging object for the whole backend: structured fields, redaction-safe,
pretty-printed locally, machine-parseable in production.

## 3. What does it do?

- Exports `logger` (pino instance) with standard child bindings (service name, env).
- Development uses pino-pretty for readable colored output; production emits raw JSON lines to stdout (Railway log console).

| Export | Use |
|---|---|
| `logger` | `logger.info({...}, msg)` / `.warn` / `.error` / `.debug` |

## 4. What does it touch?

**Connections:**
Imported by nearly every backend module. Railway retains logs ~30 days.

**Safety / data notes:**
Never log passwords, JWTs, full request bodies with credentials, connection
strings, or API keys (ENGINEERING_STANDARDS.md rule). httpLogger middleware
feeds request logs through this.
