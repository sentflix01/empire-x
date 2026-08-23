/**
 * middleware/requestId.ts — Request ID injection
 *
 * Reads X-Request-ID header if present; otherwise generates UUID v4.
 * Attaches to req.requestId and echoes back in X-Request-ID response header
 * for client-side log correlation.
 */
import type { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export default function requestId(req: Request, res: Response, next: NextFunction): void {
  const id = (req.headers['x-request-id'] as string | undefined) ?? uuidv4();
  req.requestId = id;
  res.setHeader('X-Request-ID', id);
  next();
}

module.exports = requestId;
