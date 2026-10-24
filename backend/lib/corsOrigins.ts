/**
 * Which browser origins may call the API with credentials.
 *
 * Only origins the operator configured in FRONTEND_URL are trusted, plus the
 * local dev frontend outside production. There is deliberately no hard-coded
 * production fallback: the old fallback trusted https://nodbusiness.app, a
 * domain the project doesn't own, so whoever registered it could have read
 * users' refreshed access tokens (audit SEC-08).
 */
import type { NextFunction, Request, Response } from 'express';
import { parseFrontendUrls } from './frontendUrl';

const LOCAL_DEV_FRONTEND = 'http://localhost:3002';

export function allowedOrigins(env: NodeJS.ProcessEnv = process.env): string[] {
  const list = parseFrontendUrls(env);
  if (env.NODE_ENV !== 'production') list.push(LOCAL_DEV_FRONTEND);
  return [...new Set(list)];
}

/** Builds a matcher for a list that may contain wildcard entries such as https://*.vercel.app. */
export function originMatcher(origins: string[]): (origin: string) => boolean {
  const exact = new Set(origins.filter((o) => !o.includes('*')));
  const wildcards = origins
    .filter((o) => o.includes('*'))
    // Escape everything except "*", then let "*" match inside one host label
    // only (no dots, slashes or ports), so a pattern can't reach another domain.
    .map((p) => new RegExp(`^${p.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[a-z0-9-]*')}$`, 'i'));
  return (origin) => exact.has(origin) || wildcards.some((rx) => rx.test(origin));
}

/**
 * Refuses a browser request whose Origin isn't trusted. Requests without an
 * Origin header (same-origin navigations, server-to-server, mobile apps) pass.
 * Used on cookie-authenticated routes such as token refresh, so a foreign page
 * can't rotate a user's session even though it can't read the response.
 */
export function requireTrustedOrigin(isTrusted: (origin: string) => boolean) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const origin = req.get('origin');
    if (!origin || isTrusted(origin)) { next(); return; }
    res.status(403).json({ error: 'Origin not allowed', code: 'ORIGIN_NOT_ALLOWED' });
  };
}
