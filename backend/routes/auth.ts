/**
 * routes/auth.ts — Authentication endpoints
 *
 * Security improvements in this file:
 *
 *   OTP hashing (Task 6):
 *     OTP codes are now stored as SHA-256(otp + OTP_SALT) in the DB instead
 *     of plaintext. Anyone with read access to the database cannot extract
 *     active OTP codes and impersonate users. The plaintext OTP is still sent
 *     to the user via email — only the stored copy is hashed.
 *     Add OTP_SALT=<random-32-char-string> to your .env.
 *
 *   Token architecture:
 *     - Access token:  15 min, returned in response body (stored in memory by client)
 *     - Refresh token: 7 days, HttpOnly Secure cookie (XSS-immune, path=/api/auth)
 *     - Revocation:    JTI stored in Redis with matching TTL
 *     - Logout-all:    revoke_before:{userId} timestamp in Redis
 */
import crypto from 'crypto';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { OAuth2Client } from 'google-auth-library';
import type { Request, Response } from 'express';
import type { Redis as RedisClient } from 'ioredis';
import pool from '../db/pool';
import { getCurrentDatabaseEnvironment, runWithDatabaseEnvironment } from '../db/pool';
import {
  clearDemoSessionCookie, clearDemoTrack1Cookie, setDemoSessionCookie, setDemoTrack1Cookie,
  signDemoAccessToken, signDemoSessionCookie, verifyDemoTrack1Cookie, isDemoSessionSecretValid,
} from '../middleware/demoEnvironment';
import { sendOtpEmail, sendPasswordResetEmail } from '../utils/mailer';
import { requireAuth } from '../middleware/auth';
import { getRedis } from '../lib/redis';
import * as apiError from '../lib/apiError';
import logger from '../lib/logger';

const router = Router();

// Legacy account-mode requests can no longer provision or authenticate a
// separate Demo identity. An authenticated Demo workspace already has verified
// server-side session state and continues through its selected database.
router.use((req, res, next) => {
  const requested = req.get('X-Account-Mode') ?? (req.body as { account_mode?: string } | undefined)?.account_mode;
  if (req.demoSession) { next(); return; }
  if (requested === 'demo') {
    res.status(409).json({ error: 'Demo is a workspace for your Real account. Sign in or create a Real account, then switch to Demo.', code: 'WORKSPACE_SWITCH_REQUIRED' });
    return;
  }
  next();
});

async function establishDemoAccountSession(userId: string, res: Response, isAnonymous = false): Promise<{ sessionId: string; expiresAt: Date }> {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Serialize logins for one Demo identity, then retire its previous session
    // so a lost cookie or a new browser can always establish a fresh session.
    await client.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [userId]);
    await client.query(
      "UPDATE demo_sessions SET status='ended', ended_at=NOW() WHERE user_id=$1 AND status='active'",
      [userId],
    );
    const { rows } = await client.query<{ id: string }>(
      "INSERT INTO demo_sessions (user_id, expires_at, is_anonymous) VALUES ($1, $2, $3) RETURNING id",
      [userId, expiresAt, isAnonymous],
    );
    await client.query('COMMIT');
    const sessionId = rows[0].id;
    setDemoSessionCookie(res, signDemoSessionCookie(sessionId, userId, expiresAt), expiresAt);
    return { sessionId, expiresAt };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

// Read at request time so a restart picks up env changes without recompiling.
// Do NOT cache at module level — the env var may not be set during test imports.
function getGoogleClient(): OAuth2Client {
  return new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
}

// Pre-computed bcrypt digest of a random string — used only to burn an
// identical amount of CPU when the email does not exist (anti-enumeration).
const DUMMY_BCRYPT_HASH = '$2a$12$R/qSj/pe5cMtU.tBG99JTucrKpq7PEFJ2Bt17Y6N5PIp.2c3zllKO';

// ── OTP helpers ───────────────────────────────────────────────────────────────

/**
 * Hash an OTP with a salt before storing in the database.
 * Uses SHA-256 — fast enough for a 6-digit code where the
 * preimage space is only 900,000 values. The OTP_SALT adds
 * an application-level secret to prevent DB-only rainbow tables.
 *
 * NOTE: if OTP_SALT is not set, falls back to a zero-byte salt
 * (still hashed, just without the app secret). Set OTP_SALT in .env.
 */
function hashOtp(otp: string): string {
  const salt = process.env.OTP_SALT ?? '';
  return crypto.createHash('sha256').update(otp + salt).digest('hex');
}

function generateOtp(): string {
  // CSPRNG — Math.random() is predictable and must never gate account access.
  return (100_000 + (crypto.randomBytes(4).readUInt32BE(0) % 900_000)).toString();
}

/**
 * Returns true when the submitted OTP matches the stored hash.
 * A null/empty stored hash (already-verified or never-issued) always fails
 * without throwing — timingSafeEqual cannot compare against a NULL column.
 */
function verifyOtp(submitted: string, storedHash: string | null | undefined): boolean {
  if (!storedHash || storedHash.length !== 64) return false;
  const submittedHash = hashOtp(submitted);
  // Constant-time compare to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(submittedHash, 'hex'),
    Buffer.from(storedHash, 'hex'),
  );
}

// ── Token helpers ─────────────────────────────────────────────────────────────

function signAccessToken(userId: string, isDemo = false): string {
  return jwt.sign(
    { sub: userId, type: 'access', demo: isDemo },
    process.env.JWT_SECRET as string,
    { expiresIn: '15m', jwtid: uuidv4() },
  );
}

function signRefreshToken(userId: string, isDemo = false): string {
  return jwt.sign(
    { sub: userId, type: 'refresh', demo: isDemo },
    process.env.JWT_SECRET as string,
    { expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN ?? '7d') as '7d', jwtid: uuidv4() },
  );
}

function refreshCookieSameSite(): 'lax' | 'none' {
  // Local frontend/backend ports are different origins but still same-site.
  // Lax is accepted by modern browsers on localhost without Secure. Production
  // frontend/backend hosts are cross-site and require Secure + SameSite=None.
  return process.env.NODE_ENV === 'production' ? 'none' : 'lax';
}

function signToken(userId: string, res: Response, isDemo = false): string {
  const accessToken = signAccessToken(userId, isDemo);
  const refreshToken = signRefreshToken(userId, isDemo);
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    // Production frontend/backend hosts are cross-site; local ports are same-site.
    secure: isProd,
    sameSite: refreshCookieSameSite(),
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/auth',
  });
  return accessToken;
}

/** Return true only when the refresh cookie belongs to a current real account.
 * Track 1's shared demo login must not be mistaken for a user's own session. */
async function hasRealRefreshSession(req: Request): Promise<boolean> {
  const refreshToken = (req.cookies as Record<string, string | undefined> | undefined)?.refresh_token;
  if (!refreshToken) return false;

  let payload: jwt.JwtPayload;
  try {
    payload = jwt.verify(refreshToken, process.env.JWT_SECRET as string) as jwt.JwtPayload;
  } catch {
    return false;
  }
  if (payload.type !== 'refresh' || payload.demo === true || typeof payload.sub !== 'string') return false;

  try {
    // Track 2 requests are in the demo DB context; validate the retained
    // refresh session against the real users table before offering a return.
    const result = await runWithDatabaseEnvironment({ environment: 'real' }, () =>
      pool.query<{ is_demo: boolean; is_seed: boolean; is_banned: boolean }>(
        'SELECT is_demo, is_seed, is_banned FROM users WHERE id = $1',
        [payload.sub],
      ),
    );
    const user = result.rows[0];
    return Boolean(user && !user.is_demo && !user.is_seed && !user.is_banned);
  } catch {
    return false;
  }
}

async function revokeToken(jti: string, expiresAt: number): Promise<void> {
  const redis = getRedis();
  if (redis.isNoOp) return;
  const ttl = Math.max(1, Math.ceil((expiresAt * 1000 - Date.now()) / 1000));
  try {
    await (redis as RedisClient).setex(`revoked:${jti}`, ttl, '1');
  } catch {
    logger.warn({ jti }, 'auth: failed to write revocation to Redis');
  }
}

async function isRevoked(jti: string | undefined, userId?: string | undefined, iat?: number | undefined, isDemo = false): Promise<boolean> {
  if (!jti && !userId) return false;
  if (isDemo) return false;
  const redis = getRedis();
  if (redis.isNoOp) return false;
  try {
    if (jti) {
      const val = await (redis as RedisClient).get(`revoked:${jti}`);
      if (val === '1') return true;
    }
    if (userId && iat !== undefined) {
      const revokeBefore = await (redis as RedisClient).get(`revoke_before:${userId}`);
      if (revokeBefore && iat < parseInt(revokeBefore, 10)) return true;
    }
    return false;
  } catch {
    return false;
  }
}

// ── POST /api/auth/register ───────────────────────────────────────────────────

router.post('/register', async (req: Request, res: Response) => {
  if (process.env.ADMIN_ONLY_MODE === 'true') {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  const { email, password, full_name } = req.body as {
    email?: string; password?: string; full_name?: string;
  };
  if (!email || !password) {
    apiError.validationError(res, 'Email and password are required');
    return;
  }
  if (password.length < 8) {
    apiError.validationError(res, 'Password must be at least 8 characters');
    return;
  }
  if (password.length > 128) {
    apiError.validationError(res, 'Password must be at most 128 characters');
    return;
  }
  if (full_name && full_name.length > 100) {
    apiError.validationError(res, 'Name must be at most 100 characters');
    return;
  }

  try {
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await pool.query<{ id: string; is_verified: boolean; is_banned: boolean }>(
      'SELECT id, is_verified, is_banned FROM users WHERE email = $1',
      [normalizedEmail],
    );

    if (existing.rows.length) {
      if (existing.rows[0].is_banned) {
        res.status(403).json({ error: 'Account suspended. Contact support.' });
        return;
      }
      if (!existing.rows[0].is_verified) {
        const otp = generateOtp();
        const otpHash = hashOtp(otp);
        const otpExpires = new Date(Date.now() + 15 * 60 * 1000);
        await pool.query(
          'UPDATE users SET otp_code = $1, otp_expires = $2 WHERE id = $3',
          [otpHash, otpExpires, existing.rows[0].id],
        );
        try {
          await sendOtpEmail(normalizedEmail, otp);
        } catch (err) {
          logger.error({ err: (err as Error).message }, 'OTP email resend failed');
          res.status(503).json({ error: 'We could not send a verification email. Please try again shortly.', code: 'OTP_DELIVERY_FAILED' });
          return;
        }
        res.status(200).json({ message: 'Your account is awaiting verification. A new verification code has been sent.', pendingVerification: true });
        return;
      }
      res.status(409).json({ error: 'An account with this email already exists' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const otp = generateOtp();
    const otpHash = hashOtp(otp);
    const otpExpires = new Date(Date.now() + 15 * 60 * 1000);

    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO users (email, password_hash, full_name, otp_code, otp_expires, is_demo)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [normalizedEmail, passwordHash, full_name ?? null, otpHash, otpExpires, getCurrentDatabaseEnvironment() === 'demo'],
    );

    try {
      await sendOtpEmail(normalizedEmail, otp);
    } catch (err) {
      logger.error({ err: (err as Error).message }, 'OTP email delivery failed');
      res.status(503).json({ error: 'We could not send a verification email. Please try again shortly.', code: 'OTP_DELIVERY_FAILED' });
      return;
    }

    res.status(201).json({ message: 'Registration successful. Check your email for the verification code.' });
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'Register error');
    apiError.serverError(res, 'Registration failed');
  }
});

// ── POST /api/auth/verify-otp ─────────────────────────────────────────────────

// Per-email OTP attempt counter — max 10 wrong guesses before the code is
// invalidated and a new one must be requested. Prevents brute-forcing the
// 900,000-value space within the 15-minute OTP window.
const OTP_ATTEMPT_MAX = 10;
const OTP_ATTEMPT_TTL = 15 * 60; // matches OTP expiry

router.post('/verify-otp', async (req: Request, res: Response) => {
  const { email, otpCode } = req.body as { email?: string; otpCode?: string };
  if (!email || !otpCode) {
    apiError.validationError(res, 'Email and code are required');
    return;
  }

  try {
    const { rows } = await pool.query<{
      id: string; otp_code: string | null; otp_expires: Date | null;
      is_demo: boolean; is_seed: boolean; onboarding_mode: 'demo' | 'real' | null;
    }>('SELECT id, otp_code, otp_expires, is_demo, is_seed FROM users WHERE email = $1', [email.toLowerCase()]);

    if (!rows.length) {
      apiError.notFound(res, 'User not found');
      return;
    }
    const user = rows[0];

    if (!user.otp_code || !user.otp_expires) {
      apiError.validationError(res, 'No verification code is pending. Request a new code.');
      return;
    }

    // Check expiry before OTP to prevent timing side-channel
    if (new Date() > new Date(user.otp_expires)) {
      apiError.validationError(res, 'Verification code has expired');
      return;
    }

    // ── Brute-force protection: per-email attempt counter ─────────────────
    const redis = user.is_demo || user.is_seed ? null : getRedis();
    const attemptKey = `otp_attempts:${email.toLowerCase()}`;
    if (redis && !redis.isNoOp) {
      try {
        const attempts = await (redis as RedisClient).incr(attemptKey);
        if (attempts === 1) {
          // Set TTL only on first increment — Redis INCR creates the key
          await (redis as RedisClient).expire(attemptKey, OTP_ATTEMPT_TTL);
        }
        if (attempts > OTP_ATTEMPT_MAX) {
          // Invalidate the OTP so the user must request a fresh code
          await pool.query(
            'UPDATE users SET otp_code = NULL, otp_expires = NULL WHERE id = $1',
            [user.id],
          );
          await (redis as RedisClient).del(attemptKey);
          apiError.validationError(res, 'Too many failed attempts. Please request a new verification code.');
          return;
        }
      } catch (redisErr) {
        logger.warn({ err: (redisErr as Error).message }, 'OTP attempt counter Redis error — continuing');
      }
    }
    // ─────────────────────────────────────────────────────────────────────

    if (!verifyOtp(otpCode, user.otp_code)) {
      apiError.validationError(res, 'Invalid verification code');
      return;
    }

    // Correct OTP — clear the attempt counter
    if (redis && !redis.isNoOp) {
      (redis as RedisClient).del(attemptKey).catch(() => undefined);
    }

    const { rows: banCheck } = await pool.query<{ is_banned: boolean; is_demo: boolean; is_seed: boolean }>(
      'SELECT is_banned, is_demo, is_seed FROM users WHERE id = $1',
      [user.id],
    );
    if (banCheck[0]?.is_banned) {
      res.status(403).json({ error: 'Account suspended. Contact support.' });
      return;
    }

    await pool.query(
      'UPDATE users SET is_verified = TRUE, otp_code = NULL, otp_expires = NULL WHERE id = $1',
      [user.id],
    );

    const isDemoEnvironment = getCurrentDatabaseEnvironment() === 'demo';
    if (isDemoEnvironment) {
      const session = await establishDemoAccountSession(user.id, res);
      res.json({ access_token: signDemoAccessToken(user.id, session.sessionId), is_demo: true, onboarding_mode: 'demo' });
      return;
    }
    const isDemo = Boolean(banCheck[0]?.is_demo || banCheck[0]?.is_seed);
    if (isDemo) {
      res.status(403).json({ error: 'This legacy Demo identity is not linked to a Real account. Sign in to Real and switch to Demo.', code: 'LEGACY_DEMO_ACCOUNT' });
      return;
    }
    res.json({ access_token: signToken(user.id, res), is_demo: false });
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'Verify OTP error');
    apiError.serverError(res, 'Verification failed');
  }
});

// ── POST /api/auth/resend-otp ─────────────────────────────────────────────────

router.post('/resend-otp', async (req: Request, res: Response) => {
  const { email } = req.body as { email?: string };
  if (!email) {
    apiError.validationError(res, 'Email is required');
    return;
  }

  // Always return 200 — prevents email enumeration (same pattern as /forgot-password)
  res.json({ message: 'If an account exists, a new verification code has been sent.' });

  try {
    const { rows } = await pool.query<{ id: string; is_banned: boolean }>(
      'SELECT id, is_banned FROM users WHERE email = $1',
      [email.toLowerCase()],
    );
    if (!rows.length) return;
    if (rows[0].is_banned) return;

    const otp = generateOtp();
    const otpHash = hashOtp(otp);
    const otpExpires = new Date(Date.now() + 15 * 60 * 1000);

    await pool.query(
      'UPDATE users SET otp_code = $1, otp_expires = $2 WHERE id = $3',
      [otpHash, otpExpires, rows[0].id],
    );

    await sendOtpEmail(email, otp).catch((err) =>
      logger.error({ err: (err as Error).message }, 'OTP email resend failed'),
    );
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'Resend OTP error');
  }
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────

router.post('/demo', async (req: Request, res: Response) => {
  if (req.demoSession) {
    res.json({
      access_token: signDemoAccessToken(req.demoSession.userId, req.demoSession.id),
      demo: true,
      anonymous: req.demoSession.isAnonymous,
      expires_at: req.demoSession.expiresAt.toISOString(),
    });
    return;
  }
  if (process.env.DEMO_ENABLED !== 'true' || !process.env.DEMO_DATABASE_URL || !isDemoSessionSecretValid()) {
    res.status(503).json({ error: 'Demo practice is not configured yet.', code: 'DEMO_CONFIGURATION_INVALID' });
    return;
  }

  const userId = uuidv4();
  const sessionId = uuidv4();
  const email = `visitor-${userId}@demo.nodbusiness.invalid`;
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  try {
    await runWithDatabaseEnvironment({ environment: 'demo', demoSessionId: sessionId, demoUserId: userId }, async () => {
      const db = await pool.connect();
      try {
        await db.query('BEGIN');
        await db.query(
          `INSERT INTO users (id, email, full_name, role, provider, is_verified, is_demo, is_seed)
           VALUES ($1, $2, 'Demo Visitor', 'user', 'local', TRUE, TRUE, FALSE)`,
          [userId, email],
        );
        await db.query(
          `INSERT INTO user_profiles (user_id, display_name, profile_type)
           VALUES ($1, 'Demo Visitor', 'personal')`,
          [userId],
        );
        await db.query(
          `INSERT INTO demo_sessions (id, user_id, expires_at, is_anonymous)
           VALUES ($1, $2, $3, TRUE)`,
          [sessionId, userId, expiresAt],
        );
        await db.query('COMMIT');
      } catch (error) {
        await db.query('ROLLBACK').catch(() => undefined);
        throw error;
      } finally {
        db.release();
      }
    });
    setDemoSessionCookie(res, signDemoSessionCookie(sessionId, userId, expiresAt), expiresAt);
    res.json({
      access_token: signDemoAccessToken(userId, sessionId),
      demo: true,
      anonymous: true,
      expires_at: expiresAt.toISOString(),
    });
  } catch (error) {
    logger.error({ err: (error as Error).message, requestId: req.requestId }, 'Anonymous Demo session creation failed');
    res.status(503).json({ error: 'Could not start Demo practice. Please try again shortly.', code: 'DEMO_UNAVAILABLE' });
  }
});

router.post('/demo/exit', async (req: Request, res: Response) => {
  if (!req.demoSession) {
    const returnToReal = await hasRealRefreshSession(req);
    clearDemoSessionCookie(res);
    clearDemoTrack1Cookie(res);
    res.json({ success: true, return_to_real: returnToReal });
    return;
  }
  try {
    await pool.query("UPDATE demo_sessions SET status = 'ended', ended_at = NOW() WHERE id = $1 AND status = 'active'", [req.demoSession.id]);
    const returnToReal = await hasRealRefreshSession(req);
    clearDemoSessionCookie(res);
    clearDemoTrack1Cookie(res);
    res.json({ success: true, return_to_real: returnToReal });
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'Demo exit failed');
    res.status(503).json({ error: 'Could not end demo session', code: 'DEMO_UNAVAILABLE' });
  }
});

router.post('/demo/reset', async (req: Request, res: Response) => {
  if (!req.demoSession) { res.status(401).json({ error: 'An active demo session is required' }); return; }
  try {
    await pool.query("UPDATE demo_sessions SET status='ended', ended_at=NOW() WHERE id=$1 AND status='active'", [req.demoSession.id]);
    const session = await establishDemoAccountSession(req.demoSession.userId, res, req.demoSession.isAnonymous);
    setDemoSessionCookie(res, signDemoSessionCookie(session.sessionId, req.demoSession.userId, session.expiresAt), session.expiresAt);
    res.json({
      access_token: signDemoAccessToken(req.demoSession.userId, session.sessionId),
      demo: true,
      expires_at: session.expiresAt.toISOString(),
    });
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'Demo reset failed');
    res.status(503).json({ error: 'Could not reset demo session', code: 'DEMO_UNAVAILABLE' });
  }
});

/** Switch the signed-in identity between its Real account and its isolated
 * practice workspace. The workspace selector is a request to the server;
 * authorization and database routing still come from verified session state. */
router.post('/workspace', requireAuth, async (req: Request, res: Response) => {
  const workspace = (req.body as { workspace?: unknown } | undefined)?.workspace;
  if (workspace !== 'real' && workspace !== 'demo') {
    apiError.validationError(res, 'workspace must be either real or demo');
    return;
  }
  const user = req.user;
  if (!user) { res.status(401).json({ error: 'Authentication required' }); return; }

  try {
    if (workspace === 'demo') {
      if (req.demoSession) {
        res.json({ access_token: signDemoAccessToken(user.id, req.demoSession.id), workspace: 'demo' });
        return;
      }
      const realIdentity = await runWithDatabaseEnvironment({ environment: 'real' }, async () => {
        const { rows } = await pool.query<{ id: string; email: string; full_name: string | null; is_demo: boolean; is_seed: boolean; is_banned: boolean }>(
          'SELECT id, email, full_name, is_demo, is_seed, is_banned FROM users WHERE id=$1', [user.id],
        );
        return rows[0];
      });
      if (!realIdentity || realIdentity.email.toLowerCase() !== user.email.toLowerCase() || realIdentity.is_demo || realIdentity.is_seed || realIdentity.is_banned) {
        res.status(403).json({ error: 'Sign in to your Real account before opening its Demo workspace.', code: 'REAL_IDENTITY_REQUIRED' });
        return;
      }
      if (process.env.DEMO_ENABLED !== 'true' || !process.env.DEMO_DATABASE_URL || !isDemoSessionSecretValid()) {
        res.status(503).json({ error: 'Demo workspace is not configured yet.', code: 'DEMO_CONFIGURATION_INVALID' });
        return;
      }

      const workspaceResult = await runWithDatabaseEnvironment({ environment: 'demo' }, async () => {
        const existing = await pool.query<{ id: string; email: string; is_demo: boolean; is_seed: boolean; workspace_owner_id: string | null }>(
          'SELECT id, email, is_demo, is_seed, workspace_owner_id FROM users WHERE id=$1 OR email=$2 LIMIT 1', [user.id, user.email],
        );
        const byId = existing.rows.find((row) => row.id === user.id);
        const emailConflict = existing.rows.find((row) => row.email.toLowerCase() === user.email.toLowerCase() && row.id !== user.id);
        if (emailConflict || (byId && (!byId.is_demo || byId.is_seed || byId.email.toLowerCase() !== user.email.toLowerCase() || byId.workspace_owner_id !== user.id))) {
          throw Object.assign(new Error('An existing Demo identity conflicts with this Real account. Its data was left unchanged.'), { statusCode: 409, code: 'DEMO_IDENTITY_CONFLICT' });
        }
        if (!byId) {
          await pool.query(
            `INSERT INTO users (id, email, full_name, is_verified, is_demo, is_seed, provider, workspace_owner_id)
            VALUES ($1,$2,$3,TRUE,TRUE,FALSE,'local',$1)`, [user.id, user.email, realIdentity.full_name],
          );
          await pool.query(
            `INSERT INTO user_profiles (user_id, display_name, profile_type)
             SELECT $1, COALESCE(display_name, $2), 'personal'
               FROM (SELECT display_name FROM user_profiles WHERE user_id=$1 LIMIT 1) source
             UNION ALL SELECT $1, COALESCE($2, 'Member'), 'personal'
              WHERE NOT EXISTS (SELECT 1 FROM user_profiles WHERE user_id=$1)`,
            [user.id, realIdentity.full_name],
          );
        }
        const session = await establishDemoAccountSession(user.id, res);
        return {
          access_token: signDemoAccessToken(user.id, session.sessionId),
          workspace: 'demo', expires_at: session.expiresAt.toISOString(),
        };
      });
      res.json(workspaceResult);
      return;
    }

    if (!req.demoSession) {
      if (user.is_demo) {
        res.status(403).json({ error: 'This legacy Demo account is not linked to a Real identity.', code: 'REAL_IDENTITY_REQUIRED' });
        return;
      }
      res.json({ access_token: signToken(user.id, res, false), workspace: 'real' });
      return;
    }

    const demoLink = await pool.query<{ workspace_owner_id: string | null }>(
      'SELECT workspace_owner_id FROM users WHERE id=$1 AND is_demo=TRUE AND is_seed=FALSE', [user.id],
    );
    if (demoLink.rows[0]?.workspace_owner_id !== user.id) {
      res.status(403).json({ error: 'This legacy Demo account is not linked to a Real identity.', code: 'REAL_IDENTITY_REQUIRED' });
      return;
    }

    const realUser = await runWithDatabaseEnvironment({ environment: 'real' }, async () => {
      const { rows } = await pool.query<{ id: string; email: string; is_demo: boolean; is_seed: boolean; is_banned: boolean }>(
        'SELECT id, email, is_demo, is_seed, is_banned FROM users WHERE id=$1', [user.id],
      );
      return rows[0];
    });
    if (!realUser || realUser.email.toLowerCase() !== user.email.toLowerCase() || realUser.is_demo || realUser.is_seed || realUser.is_banned) {
      res.status(403).json({ error: 'The linked Real account could not be verified.', code: 'REAL_IDENTITY_REQUIRED' });
      return;
    }
    await pool.query("UPDATE demo_sessions SET status='ended', ended_at=NOW() WHERE id=$1 AND status='active'", [req.demoSession.id]);
    clearDemoSessionCookie(res);
    clearDemoTrack1Cookie(res);
    res.json({ access_token: signToken(realUser.id, res, false), workspace: 'real' });
  } catch (err) {
    const error = err as Error & { statusCode?: number; code?: string };
    logger.error({ err: error.message, requestId: req.requestId }, 'Workspace switch failed');
    res.status(error.statusCode ?? 503).json({ error: error.message || 'Could not switch workspace', code: error.code ?? 'WORKSPACE_SWITCH_FAILED' });
  }
});

router.post('/onboarding-mode', (_req: Request, res: Response) => {
  res.status(410).json({ error: 'Account modes are no longer selectable. Sign in to Real, then switch workspaces from the app.', code: 'WORKSPACE_SWITCH_REQUIRED' });
});

const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_TTL_SECONDS = 15 * 60; // 15 minutes

router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    apiError.validationError(res, 'Email and password are required');
    return;
  }

  try {
    const { rows } = await pool.query<{
      id: string; email: string; password_hash: string | null;
      is_verified: boolean; role: string; is_banned: boolean;
      is_demo: boolean; is_seed: boolean; onboarding_mode: 'demo' | 'real' | null;
    }>(
      'SELECT id, email, password_hash, is_verified, role, is_banned, is_demo, is_seed, onboarding_mode FROM users WHERE email = $1',
      [email.toLowerCase()],
    );
    if (!rows.length) {
      await bcrypt.compare(password, DUMMY_BCRYPT_HASH);
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }
    const user = rows[0];
    if (user.is_banned) {
      res.status(403).json({ error: 'Account suspended. Contact support.' });
      return;
    }

    // ── Account lockout check ────────────────────────────────────────────
    const redis = user.is_demo || user.is_seed ? null : getRedis();
    const lockoutKey = `lockout:${user.email}`;
    const failedKey = `failed_login:${user.email}`;

    if (redis) {
      try {
        const isLocked = await redis.get(lockoutKey);
        if (isLocked) {
          res.status(429).json({ error: 'Too many failed attempts. Please try again in 15 minutes.' });
          return;
        }
      } catch {
        // Redis unavailable — skip lockout check, continue with login
      }
    }

    if (!user.password_hash) {
      await bcrypt.compare(password, DUMMY_BCRYPT_HASH);
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      // ── Increment failed login counter ───────────────────────────────
      if (redis) {
        try {
          const attempts = (await redis.incr(failedKey)) ?? 0;
          if (attempts === 1) {
            await redis.expire(failedKey, LOCKOUT_TTL_SECONDS);
          }
          if (attempts >= LOCKOUT_THRESHOLD) {
            await redis.set(lockoutKey, '1', 'EX', LOCKOUT_TTL_SECONDS);
            await redis.del(failedKey);
            logger.warn({ userId: user.id, email: user.email }, 'Account locked after 5 failed login attempts');
            try {
              await sendPasswordResetEmail(user.email, 'lockout-alert');
            } catch {
              // Best-effort alert — don't fail the response
            }
          }
        } catch {
          // Redis unavailable — skip attempt tracking, continue with login
        }
      }
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    // ── Successful login — clear failed attempts ─────────────────────────
    if (redis) {
      redis.del(failedKey).catch(() => undefined);
    }

    if (!user.is_verified) {
      const otp = generateOtp();
      const otpHash = hashOtp(otp);
      const otpExpires = new Date(Date.now() + 15 * 60 * 1000);
      await pool.query(
        'UPDATE users SET otp_code = $1, otp_expires = $2 WHERE id = $3',
        [otpHash, otpExpires, user.id],
      );
      try {
        await sendOtpEmail(user.email, otp);
      } catch (err) {
        logger.error({ err: (err as Error).message, userId: user.id }, 'OTP email delivery failed during login');
        res.status(503).json({ error: 'We could not send a verification email. Please try again shortly.', code: 'OTP_DELIVERY_FAILED' });
        return;
      }
      res.status(403).json({
        error: 'Please verify your email before logging in. A new verification code has been sent.',
        code: 'email_not_verified',
        pendingVerification: true,
      });
      return;
    }

    if (process.env.ADMIN_ONLY_MODE === 'true' && user.role !== 'admin') {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    if (getCurrentDatabaseEnvironment() === 'demo') {
      const session = await establishDemoAccountSession(user.id, res);
      res.json({ access_token: signDemoAccessToken(user.id, session.sessionId), onboarding_mode: 'demo', is_demo: true });
      return;
    }
    if (user.is_demo || user.is_seed) {
      res.status(403).json({ error: 'This legacy Demo identity is not linked to a Real account. Sign in to Real and switch to Demo.', code: 'LEGACY_DEMO_ACCOUNT' });
      return;
    }
    const token = signToken(user.id, res);
    res.json({ access_token: token, onboarding_mode: user.onboarding_mode ?? null, is_demo: false });
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'Login error');
    apiError.serverError(res, 'Login failed');
  }
});

// ── POST /api/auth/google ─────────────────────────────────────────────────────

router.post('/google', async (req: Request, res: Response) => {
  const { id_token } = req.body as { id_token?: string };
  if (!id_token) {
    apiError.validationError(res, 'id_token is required');
    return;
  }

  if (!process.env.GOOGLE_CLIENT_ID) {
    logger.error('GOOGLE_CLIENT_ID env var not set — Google OAuth disabled');
    res.status(503).json({ error: 'Google sign-in is not configured. Please use email/password.' });
    return;
  }

  let payload;
  try {
    const ticket = await getGoogleClient().verifyIdToken({
      idToken: id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch (err) {
    const msg = (err as Error).message ?? '';
    // Classify the error so the frontend can show an actionable message:
    //   - Audience mismatch / invalid token → 401 (misconfiguration, client can retry after fix)
    //   - Network failure reaching Google → 503 (transient, client should retry)
    //   - Anything else → 401 (default safe response)
    const isNetworkError =
      msg.includes('ENOTFOUND') ||
      msg.includes('ECONNREFUSED') ||
      msg.includes('ETIMEDOUT') ||
      msg.includes('network') ||
      msg.includes('fetch');
    const isAudienceMismatch =
      msg.includes('audience') ||
      msg.includes('client_id') ||
      msg.includes('aud');

    if (isNetworkError) {
      logger.error({ err: msg }, 'Google ID token verification failed — network error reaching Google');
      res.status(503).json({
        error: 'Google sign-in is temporarily unavailable. Please try again in a moment.',
      });
    } else if (isAudienceMismatch) {
      logger.error({ err: msg }, 'Google ID token audience mismatch — NEXT_PUBLIC_GOOGLE_CLIENT_ID and GOOGLE_CLIENT_ID are different');
      res.status(401).json({
        error: 'Google sign-in could not be verified. Ensure the frontend and backend use the same Google OAuth client ID.',
      });
    } else {
      logger.warn({ err: msg }, 'Google ID token verification failed');
      res.status(401).json({
        error: 'Google sign-in could not be verified. Ensure the frontend and backend use the same Google OAuth client ID.',
      });
    }
    return;
  }

  if (!payload) {
    res.status(401).json({ error: 'Google sign-in could not be verified.' });
    return;
  }

  try {
    const { sub: googleId, email, name } = payload;
    if (!email) {
      res.status(401).json({ error: 'Google account has no email' });
      return;
    }

    let user = (await pool.query<{ id: string }>(
      'SELECT id FROM users WHERE provider = $1 AND provider_id = $2',
      ['google', googleId],
    )).rows[0];

    if (!user) {
      const existing = (await pool.query<{ id: string }>(
        'SELECT id FROM users WHERE email = $1',
        [email.toLowerCase()],
      )).rows[0];

      if (existing) {
        await pool.query(
          'UPDATE users SET provider = $1, provider_id = $2, is_verified = TRUE WHERE id = $3',
          ['google', googleId, existing.id],
        );
        user = existing;
      } else {
        const demoEnvironment = getCurrentDatabaseEnvironment() === 'demo';
        const { rows } = await pool.query<{ id: string }>(
          `INSERT INTO users (email, full_name, provider, provider_id, is_verified, is_demo)
           VALUES ($1, $2, 'google', $3, TRUE, $4) RETURNING id`,
          [email.toLowerCase(), name ?? null, googleId, demoEnvironment],
        );
        user = rows[0];
      }
    }

    if (process.env.ADMIN_ONLY_MODE === 'true') {
      const { rows: roleCheck } = await pool.query<{ role: string }>(
        'SELECT role FROM users WHERE id = $1',
        [user.id],
      );
      if (!roleCheck.length || roleCheck[0].role !== 'admin') {
        res.status(404).json({ error: 'Not found' });
        return;
      }
    }

    const { rows: banCheck } = await pool.query<{ is_banned: boolean; is_demo: boolean; is_seed: boolean }>(
      'SELECT is_banned, is_demo, is_seed FROM users WHERE id = $1',
      [user.id],
    );
    if (banCheck[0]?.is_banned) {
      res.status(403).json({ error: 'Account suspended. Contact support.' });
      return;
    }
    if (getCurrentDatabaseEnvironment() === 'demo') {
      const session = await establishDemoAccountSession(user.id, res);
      res.json({ access_token: signDemoAccessToken(user.id, session.sessionId), onboarding_mode: 'demo', is_demo: true });
      return;
    }
    if (banCheck[0]?.is_demo || banCheck[0]?.is_seed) {
      res.status(403).json({ error: 'This legacy Demo identity is not linked to a Real account. Sign in to Real and switch to Demo.', code: 'LEGACY_DEMO_ACCOUNT' });
      return;
    }

    const token = signToken(user.id, res);
    const mode = (await pool.query<{ onboarding_mode: 'demo' | 'real' | null }>(
      'SELECT onboarding_mode FROM users WHERE id = $1', [user.id],
    )).rows[0]?.onboarding_mode ?? null;
    res.json({ access_token: token, onboarding_mode: mode, is_demo: false });
  } catch (err) {
    logger.error({ err: (err as Error).message, stack: (err as Error).stack?.split('\n').slice(0,3).join(' | ') }, 'Google auth error — DB or unexpected failure');
    apiError.serverError(res, 'Google sign-in is temporarily unavailable. Please try again.');
  }
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────

router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.email,
              COALESCE(NULLIF(TRIM(u.full_name), ''), up.display_name) AS full_name,
              u.role, u.is_verified, u.is_demo, u.onboarding_mode, u.created_at
       FROM users u
       LEFT JOIN LATERAL (
         SELECT display_name FROM user_profiles
         WHERE user_id = u.id
           AND display_name IS NOT NULL AND TRIM(display_name) <> ''
         ORDER BY updated_at DESC NULLS LAST, created_at DESC
         LIMIT 1
       ) up ON TRUE
       WHERE u.id = $1`,
      [req.user!.id],
    );
    if (!rows.length) {
      apiError.notFound(res, 'User not found');
      return;
    }
    if (process.env.ADMIN_ONLY_MODE === 'true' && rows[0].role !== 'admin') {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    res.json({
      ...rows[0],
      // The HttpOnly cookie is intentionally invisible to the browser. Expose
      // only the active environment state needed to render the correct UI.
      demo_track: req.demoSession ? 2 : (rows[0].is_demo ? 1 : null),
      demo_session_active: Boolean(req.demoSession),
      demo_session_anonymous: Boolean(req.demoSession?.isAnonymous),
      demo_expires_at: req.demoSession?.expiresAt.toISOString() ?? null,
      demo_workspace_available: process.env.DEMO_ENABLED === 'true' && Boolean(process.env.DEMO_DATABASE_URL) && isDemoSessionSecretValid(),
    });
  } catch (err) {
    logger.error({ err }, 'Me error');
    apiError.serverError(res, 'Failed to fetch user');
  }
});

// ── POST /api/auth/forgot-password ───────────────────────────────────────────

router.post('/forgot-password', async (req: Request, res: Response) => {
  // Always 200 — prevents user enumeration
  res.json({ message: 'If an account exists, a reset link has been sent.' });

  const { email } = req.body as { email?: string };
  if (!email) return;

  try {
    const { rows } = await pool.query<{ id: string }>(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()],
    );
    if (!rows.length) return;

    const token = uuidv4();
    // Store only a hash — same rationale as OTP hashing: a DB reader must not
    // be able to mint valid reset links. The plaintext token exists solely
    // inside the emailed link.
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    await pool.query(
      'UPDATE users SET reset_token = $1, reset_expires = $2 WHERE id = $3',
      [tokenHash, expires, rows[0].id],
    );
    const accountMode = getCurrentDatabaseEnvironment();
    await sendPasswordResetEmail(email, token, accountMode).catch((err: Error) =>
      logger.error({ err }, 'Reset email failed'),
    );
  } catch (err) {
    logger.error({ err }, 'Forgot password error');
  }
});

// ── POST /api/auth/reset-password ────────────────────────────────────────────

router.post('/reset-password', async (req: Request, res: Response) => {
  const { token, password } = req.body as { token?: string; password?: string };
  if (!token || !password) {
    apiError.validationError(res, 'Token and new password are required');
    return;
  }
  if (password.length < 8) {
    apiError.validationError(res, 'Password must be at least 8 characters');
    return;
  }
  if (password.length > 128) {
    apiError.validationError(res, 'Password must be at most 128 characters');
    return;
  }

  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const { rows } = await pool.query<{ id: string; reset_expires: Date }>(
      'SELECT id, reset_expires FROM users WHERE reset_token = $1',
      [tokenHash],
    );
    if (!rows.length) {
      apiError.validationError(res, 'Invalid or expired reset link');
      return;
    }
    if (new Date() > new Date(rows[0].reset_expires)) {
      apiError.validationError(res, 'Reset link has expired');
      return;
    }
    // Prevent banned users from resetting password
    const { rows: banCheck } = await pool.query<{ is_banned: boolean; is_demo: boolean; is_seed: boolean }>(
      'SELECT is_banned, is_demo, is_seed FROM users WHERE id = $1',
      [rows[0].id],
    );
    if (banCheck[0]?.is_banned) {
      res.status(403).json({ error: 'Account suspended. Contact support.' });
      return;
    }
    const hash = await bcrypt.hash(password, 12);
    await pool.query(
      'UPDATE users SET password_hash = $1, reset_token = NULL, reset_expires = NULL WHERE id = $2',
      [hash, rows[0].id],
    );
    const isDemo = Boolean(banCheck[0]?.is_demo || banCheck[0]?.is_seed);
    const redis = isDemo ? null : getRedis();
    if (redis && !redis.isNoOp) {
      try {
        await (redis as RedisClient).setex(
          `revoke_before:${rows[0].id}`,
          7 * 24 * 60 * 60,
          Math.floor(Date.now() / 1000).toString(),
        );
      } catch { /* non-fatal */ }
    }
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    logger.error({ err }, 'Reset password error');
    apiError.serverError(res, 'Failed to reset password');
  }
});

// ── PUT /api/auth/change-password ────────────────────────────────────────────

router.put('/change-password', requireAuth, async (req: Request, res: Response) => {
  const { current_password, new_password } = req.body as {
    current_password?: string; new_password?: string;
  };
  if (!current_password || !new_password) {
    apiError.validationError(res, 'Both current and new password are required');
    return;
  }
  if (new_password.length < 8) {
    apiError.validationError(res, 'Password must be at least 8 characters');
    return;
  }
  if (new_password.length > 128) {
    apiError.validationError(res, 'Password must be at most 128 characters');
    return;
  }

  try {
    const { rows } = await pool.query<{ password_hash: string | null }>(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.user!.id],
    );
    if (!rows[0]?.password_hash) {
      apiError.validationError(res, 'Cannot change password for OAuth accounts');
      return;
    }
    const match = await bcrypt.compare(current_password, rows[0].password_hash);
    if (!match) {
      apiError.validationError(res, 'Current password is incorrect');
      return;
    }
    const hash = await bcrypt.hash(new_password, 12);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.user!.id]);
    const redis = getRedis();
    if (!redis.isNoOp) {
      try {
        await (redis as RedisClient).setex(
          `revoke_before:${req.user!.id}`,
          7 * 24 * 60 * 60,
          Math.floor(Date.now() / 1000).toString(),
        );
      } catch { /* non-fatal */ }
    }
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    logger.error({ err }, 'Change password error');
    apiError.serverError(res, 'Failed to change password');
  }
});

// ── POST /api/auth/refresh ────────────────────────────────────────────────────

router.post('/refresh', async (req: Request, res: Response) => {
  if (req.demoSession) {
    res.json({ access_token: signDemoAccessToken(req.demoSession.userId, req.demoSession.id), demo: true });
    return;
  }
  const demoTrack1Token = (req.cookies as Record<string, string | undefined> | undefined)?.demo_track1;
  if (demoTrack1Token) {
    try {
      const demoUserId = verifyDemoTrack1Cookie(demoTrack1Token);
      if (process.env.DEMO_ENABLED !== 'true') {
        const { rows } = await pool.query<{ id: string; is_banned: boolean; is_demo: boolean; is_seed: boolean }>(
          'SELECT id, is_banned, is_demo, is_seed FROM users WHERE id = $1',
          [demoUserId],
        );
        if (rows[0] && !rows[0].is_banned && rows[0].is_demo && !rows[0].is_seed) {
          res.json({ access_token: signAccessToken(rows[0].id, true), demo: true, track: 1 });
          return;
        }
      }
    } catch { /* stale selector: clear it and try the real refresh session */ }
    clearDemoTrack1Cookie(res);
  }
  const refreshToken = (req.cookies as Record<string, string | undefined>)?.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ error: 'No refresh token' });
    return;
  }

  let payload: jwt.JwtPayload;
  try {
    payload = jwt.verify(refreshToken, process.env.JWT_SECRET as string) as jwt.JwtPayload;
  } catch {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
    return;
  }

  if (payload.type !== 'refresh') {
    res.status(401).json({ error: 'Invalid token type' });
    return;
  }

  const { rows } = await pool.query<{ id: string; is_banned: boolean; is_demo: boolean; is_seed: boolean }>(
    'SELECT id, is_banned, is_demo, is_seed FROM users WHERE id = $1',
    [payload.sub],
  );
  if (!rows.length) {
    res.status(401).json({ error: 'User not found' });
    return;
  }
  if (rows[0].is_banned) {
    res.status(403).json({ error: 'Your account has been suspended. Contact support.' });
    return;
  }

  const demoAccount = Boolean(rows[0].is_demo || rows[0].is_seed);
  if (payload.demo === true) {
    // Reject access tokens minted by the retired shared-demo environment.
    if (process.env.DEMO_ENABLED === 'true' || !demoAccount) {
      res.status(401).json({ error: 'Legacy demo credentials are no longer valid. Start a new demo session.', code: 'DEMO_SESSION_REQUIRED' });
      return;
    }
    const accessToken = signToken(payload.sub as string, res, true);
    res.json({ access_token: accessToken, demo: true });
    return;
  }

  if (demoAccount) {
    res.status(401).json({ error: 'Legacy demo credentials are no longer valid. Start a new demo session.', code: 'DEMO_SESSION_REQUIRED' });
    return;
  }

  if (await isRevoked(payload.jti, payload.sub as string, payload.iat)) {
    res.status(401).json({ error: 'Token has been revoked' });
    return;
  }

  await revokeToken(payload.jti as string, payload.exp as number).catch(() => undefined);
  const accessToken = signToken(payload.sub as string, res);
  res.json({ access_token: accessToken });
});

// ── POST /api/auth/logout ─────────────────────────────────────────────────────

router.post('/logout', async (req: Request, res: Response) => {
  if (req.demoSession) {
    await pool.query("UPDATE demo_sessions SET status = 'ended', ended_at = NOW() WHERE id = $1 AND status = 'active'", [req.demoSession.id]);
    clearDemoSessionCookie(res);
    clearDemoTrack1Cookie(res);
    res.clearCookie('refresh_token', {
      httpOnly: true,
      path: '/api/auth',
      secure: process.env.NODE_ENV === 'production',
      sameSite: refreshCookieSameSite(),
    });
    res.json({ success: true, demo_ended: true });
    return;
  }
  const refreshToken = (req.cookies as Record<string, string | undefined>)?.refresh_token;
  if (refreshToken) {
    try {
      const payload = jwt.verify(refreshToken, process.env.JWT_SECRET as string) as jwt.JwtPayload;
      if (payload.jti) {
        const { rows } = await pool.query<{ is_demo: boolean; is_seed: boolean }>(
          'SELECT is_demo, is_seed FROM users WHERE id = $1', [payload.sub],
        );
        if (!(payload.demo === true || rows[0]?.is_demo || rows[0]?.is_seed)) {
          await revokeToken(payload.jti, payload.exp as number);
        }
      }
    } catch { /* already expired */ }
  }
  res.clearCookie('refresh_token', {
    httpOnly: true,
    path: '/api/auth',
    secure: process.env.NODE_ENV === 'production',
    sameSite: refreshCookieSameSite(),
  });
  clearDemoTrack1Cookie(res);
  res.json({ success: true });
});

// ── POST /api/auth/logout-all ─────────────────────────────────────────────────

router.post('/logout-all', requireAuth, async (req: Request, res: Response) => {
  const refreshToken = (req.cookies as Record<string, string | undefined>)?.refresh_token;
  if (refreshToken) {
    try {
      const payload = jwt.verify(refreshToken, process.env.JWT_SECRET as string) as jwt.JwtPayload;
      if (payload.jti) await revokeToken(payload.jti, payload.exp as number);
    } catch { /* ignore */ }
  }

  const redis = getRedis();
  if (!redis.isNoOp) {
    try {
      await (redis as RedisClient).setex(
        `revoke_before:${req.user!.id}`,
        7 * 24 * 60 * 60,
        Math.floor(Date.now() / 1000).toString(),
      );
    } catch { /* non-fatal */ }
  }

  res.clearCookie('refresh_token', {
    httpOnly: true,
    path: '/api/auth',
    secure: process.env.NODE_ENV === 'production',
    sameSite: refreshCookieSameSite(),
  });
  clearDemoTrack1Cookie(res);
  res.json({ success: true });
});

module.exports = router;
