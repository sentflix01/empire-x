/**
 * middleware/apiVersion.ts — Sets API-Version response header on every response.
 */
import type { Request, Response, NextFunction } from 'express';

export default function apiVersion(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('API-Version', '1');
  next();
}

module.exports = apiVersion;
