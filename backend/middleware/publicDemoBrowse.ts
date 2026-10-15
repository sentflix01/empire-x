import type { NextFunction, Request, Response } from 'express';
import { runWithDatabaseEnvironment } from '../db/pool';

const PUBLIC_DEMO_HEADER = 'X-Public-Demo-Read';

/** Keep anonymous demo browsing limited to data used by public discovery pages. */
export function isPublicDemoReadPath(path: string): boolean {
  const uuid = '[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
  return /^\/api\/(?:posts|businesses|products|profiles|showrooms)$/.test(path) ||
    new RegExp(`^/api/(?:posts|businesses|products|profiles|showrooms)/${uuid}(?:/comments)?$`, 'i').test(path) ||
    path === '/api/stories' || new RegExp(`^/api/stories/user/${uuid}$`, 'i').test(path);
}

export function publicDemoBrowseMiddleware(req: Request, res: Response, next: NextFunction): void {
  res.vary(PUBLIC_DEMO_HEADER);
  if (req.get(PUBLIC_DEMO_HEADER) !== '1') { next(); return; }

  // Never let this public selector override a signed-in identity or its
  // session cookie. The selector only grants access to public Demo reads.
  const hasIdentity = Boolean(req.get('authorization') || req.cookies?.refresh_token || req.cookies?.demo_session);
  if (hasIdentity || !['GET', 'HEAD'].includes(req.method) || !isPublicDemoReadPath(req.path)) {
    res.status(403).json({ error: 'Public Demo access is limited to anonymous discovery reads.', code: 'PUBLIC_DEMO_READ_ONLY' });
    return;
  }
  if (process.env.DEMO_ENABLED !== 'true' || !process.env.DEMO_DATABASE_URL) {
    res.status(503).json({ error: 'Demo browsing is temporarily unavailable.', code: 'DEMO_UNAVAILABLE' });
    return;
  }

  try {
    runWithDatabaseEnvironment({ environment: 'demo' }, () => {
      req.publicDemoRead = true;
      next();
    });
  } catch {
    res.status(503).json({ error: 'Demo browsing is temporarily unavailable.', code: 'DEMO_UNAVAILABLE' });
  }
}

module.exports = { isPublicDemoReadPath, publicDemoBrowseMiddleware };
