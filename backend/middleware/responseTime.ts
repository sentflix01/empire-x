/**
 * middleware/responseTime.ts — Adds X-Response-Time header before Node
 * commits response headers, avoiding ERR_HTTP_HEADERS_SENT errors.
 */
import type { Request, Response, NextFunction } from 'express';

export default function responseTime(_req: Request, res: Response, next: NextFunction): void {
  const startedAt = Date.now();

  const setResponseTime = (): void => {
    if (!res.headersSent) {
      res.setHeader('X-Response-Time', `${Date.now() - startedAt}ms`);
    }
  };

  const origWriteHead = res.writeHead.bind(res);
  // @ts-expect-error — overriding variadic writeHead signature
  res.writeHead = (...args: Parameters<typeof res.writeHead>): ReturnType<typeof res.writeHead> => {
    setResponseTime();
    return origWriteHead(...args);
  };

  const origFlushHeaders = res.flushHeaders.bind(res);
  res.flushHeaders = (): void => {
    setResponseTime();
    return origFlushHeaders();
  };

  next();
}

module.exports = responseTime;
