# middleware/httpLogger.ts - Request Logging
Structured Pino line per request (method,path,status,duration,requestId,userAgent). Feeds Railway JSON logs for the DevOps workflow; skips /health noise.
