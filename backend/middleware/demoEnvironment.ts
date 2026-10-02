import jwt from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';
import pool, { runWithDatabaseEnvironment } from '../db/pool';
import { parseFrontendUrls } from '../lib/frontendUrl';
import logger from '../lib/logger';

export const DEMO_SESSION_COOKIE = 'demo_session';
export const DEMO_SESSION_AUDIENCE = 'nodbusiness-demo-session';
export const DEMO_TRACK1_COOKIE = 'demo_track1';
const DEMO_TRACK1_AUDIENCE = 'nodbusiness-demo-track1';
const DEMO_COOKIE_PATH = '/';
const AUTH_RECOVERY_PATHS = new Set([
  '/api/auth/login', '/api/auth/register', '/api/auth/google', '/api/auth/verify-otp',
  '/api/auth/resend-otp', '/api/auth/forgot-password', '/api/auth/reset-password',
  '/api/auth/demo', '/api/auth/demo/exit',
]);

function canRecoverFromStaleDemoCookie(pathname: string): boolean {
  return AUTH_RECOVERY_PATHS.has(pathname);
}

interface DemoSessionClaims extends jwt.JwtPayload {
  sid: string;
  sub: string;
  type: 'demo_session';
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: (process.env.NODE_ENV === 'production' ? 'none' : 'lax') as 'none' | 'lax',
    path: DEMO_COOKIE_PATH,
  };
}

export function setDemoSessionCookie(res: Response, token: string, expiresAt: Date): void {
  res.cookie(DEMO_SESSION_COOKIE, token, { ...cookieOptions(), expires: expiresAt });
}

export function clearDemoSessionCookie(res: Response): void {
  res.clearCookie(DEMO_SESSION_COOKIE, cookieOptions());
}

function track1CookieOptions() {
  return {
    ...cookieOptions(),
    path: '/api/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

/** A signed selector for the shared Track 1 demo identity. It preserves a
 * real user's refresh cookie while making the demo access token reload-safe. */
export function setDemoTrack1Cookie(res: Response, userId: string): void {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is required for Track 1 demo sessions');
  const token = jwt.sign(
    { sub: userId, type: 'demo_track1' },
    secret,
    { audience: DEMO_TRACK1_AUDIENCE, expiresIn: '7d' },
  );
  res.cookie(DEMO_TRACK1_COOKIE, token, track1CookieOptions());
}

export function verifyDemoTrack1Cookie(token: string): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not configured');
  const claims = jwt.verify(token, secret, { audience: DEMO_TRACK1_AUDIENCE }) as jwt.JwtPayload;
  if (claims.type !== 'demo_track1' || typeof claims.sub !== 'string' || !claims.sub) {
    throw new jwt.JsonWebTokenError('Invalid Track 1 demo cookie');
  }
  return claims.sub;
}

export function clearDemoTrack1Cookie(res: Response): void {
  res.clearCookie(DEMO_TRACK1_COOKIE, track1CookieOptions());
}

/**
 * Track 1 is a shared account on the real database, so any provider-backed
 * payment or withdrawal can create real financial side effects. Only real
 * accounts and verified Track 2 sessions may start those operations.
 */
export function requireIsolatedPaymentEnvironment(req: Request, res: Response, next: NextFunction): void {
  if (req.user?.is_demo === true && !req.demoSession) {
    res.status(403).json({
      error: 'Payments are unavailable in the shared demo account. Use a real account or an isolated demo sandbox.',
      code: 'SHARED_DEMO_PAYMENTS_UNAVAILABLE',
    });
    return;
  }
  next();
}

function verifySessionCookie(token: string): DemoSessionClaims {
  const secret = getDemoSessionSecret();
  const claims = jwt.verify(token, secret, { audience: DEMO_SESSION_AUDIENCE }) as DemoSessionClaims;
  if (claims.type !== 'demo_session' || !claims.sid || !claims.sub) {
    throw new jwt.JsonWebTokenError('Invalid demo session claims');
  }
  return claims;
}

function getDemoSessionSecret(): string {
  const secret = process.env.DEMO_SESSION_SECRET;
  if (!secret) throw new Error('Demo environment is disabled: DEMO_SESSION_SECRET is not configured');
  if (Buffer.byteLength(secret, 'utf8') < 32) throw new Error('DEMO_SESSION_SECRET must contain at least 32 bytes of entropy material');
  if (secret === process.env.JWT_SECRET) throw new Error('Demo environment requires a signing secret different from JWT_SECRET');
  return secret;
}

export function isDemoSessionSecretValid(): boolean {
  try { getDemoSessionSecret(); return true; } catch { return false; }
}

function isAllowedOrigin(origin: string): boolean {
  let parsedOrigin: string;
  try { parsedOrigin = new URL(origin).origin; } catch { return false; }
  return parseFrontendUrls().some((configured) => {
    try {
      if (!configured.includes('*')) return new URL(configured).origin === parsedOrigin;
      const escaped = configured.split('*')
        .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('[^/]+');
      return new RegExp(`^${escaped.replace(/\/$/, '')}/?$`).test(parsedOrigin);
    } catch { return false; }
  });
}

/** Resolve a signed sandbox cookie before any route or auth query can run. */
export async function demoEnvironmentMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (req.path === '/health') { next(); return; }
  const token = (req.cookies as Record<string, string | undefined> | undefined)?.[DEMO_SESSION_COOKIE];
  if (!token) { next(); return; }
  if (process.env.DEMO_ENABLED !== 'true') {
    clearDemoSessionCookie(res);
    if (canRecoverFromStaleDemoCookie(req.path)) { next(); return; }
    res.status(503).json({ error: 'Demo environment is disabled', code: 'DEMO_DISABLED' });
    return;
  }

  let claims: DemoSessionClaims;
  try {
    claims = verifySessionCookie(token);
  } catch (err) {
    clearDemoSessionCookie(res);
    // Allow an explicit new-session request to replace a stale browser cookie.
    if (canRecoverFromStaleDemoCookie(req.path)) { next(); return; }
    res.status(401).json({ error: 'Demo session is invalid or expired', code: 'DEMO_SESSION_INVALID' });
    return;
  }

  await runWithDatabaseEnvironment({ environment: 'demo', demoSessionId: claims.sid, demoUserId: claims.sub }, async () => {
    try {
      const { rows } = await pool.query<{
        id: string; user_id: string; expires_at: Date; status: string;
        email: string; role: 'user' | 'admin'; is_banned: boolean; is_demo: boolean; is_seed: boolean;
      }>(
        `SELECT s.id, s.user_id, s.expires_at, s.status,
                u.email, u.role, u.is_banned, u.is_demo, u.is_seed
         FROM demo_sessions s
         JOIN users u ON u.id = s.user_id
         WHERE s.id = $1 AND s.user_id = $2`,
        [claims.sid, claims.sub],
      );
      const session = rows[0];
      const expired = !session || session.status !== 'active' || new Date(session.expires_at).getTime() <= Date.now();
      if (expired || session?.is_banned || session?.role !== 'user' || !session?.is_demo || session?.is_seed) {
        clearDemoSessionCookie(res);
        if (canRecoverFromStaleDemoCookie(req.path)) { next(); return; }
        res.status(401).json({ error: 'Demo session has ended', code: 'DEMO_SESSION_EXPIRED' });
        return;
      }

      const origin = req.get('origin');
      if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && (!origin || !isAllowedOrigin(origin))) {
        res.status(403).json({ error: 'Origin is not allowed for demo actions', code: 'DEMO_ORIGIN_FORBIDDEN' });
        return;
      }

      req.demoSession = { id: session.id, userId: session.user_id, expiresAt: new Date(session.expires_at) };
      req.user = { id: session.user_id, email: session.email, role: 'user', is_banned: false, is_demo: true };
      next();
    } catch (err) {
      logger.error({ err: (err as Error).message, requestId: req.requestId }, 'Demo session validation failed');
      // A configured demo session can never degrade into a real DB request.
      res.status(503).json({ error: 'Demo environment is temporarily unavailable', code: 'DEMO_UNAVAILABLE' });
    }
  });
}

export function signDemoSessionCookie(sessionId: string, userId: string, expiresAt: Date): string {
  const secret = getDemoSessionSecret();
  return jwt.sign(
    { sid: sessionId, sub: userId, type: 'demo_session' },
    secret,
    { audience: DEMO_SESSION_AUDIENCE, expiresIn: Math.max(1, Math.floor((expiresAt.getTime() - Date.now()) / 1000)) },
  );
}

export function signDemoAccessToken(userId: string, sessionId: string): string {
  const secret = getDemoSessionSecret();
  return jwt.sign(
    { sub: userId, sid: sessionId, type: 'access', environment: 'demo' },
    secret,
    { audience: DEMO_SESSION_AUDIENCE, expiresIn: '15m', jwtid: `${sessionId}:${Date.now()}` },
  );
}
