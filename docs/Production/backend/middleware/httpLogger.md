# middleware/httpLogger.ts - Request Logging

## 1. What is this?

**HTTP middleware.** Structured Pino line per request (method,path,status,duration,requestId,userAgent).

## 2. Why does it exist?

Structured Pino line per request (method,path,status,duration,requestId,userAgent). Feeds Railway JSON logs for the DevOps workflow; skips /health noise.

## 3. What does it do?

Structured Pino line per request (method,path,status,duration,requestId,userAgent). Feeds Railway JSON logs for the DevOps workflow; skips /health noise.

## 4. What does it touch?

Inline references only — nothing external.
