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
import { sendOtpEmail, sendPasswordResetEmail } from '../utils/mailer';
import { requireAuth } from '../middleware/auth';
import { getRedis } from '../lib/redis';
import * as apiError from '../lib/apiError';
import logger from '../lib/logger';

const router = Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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

function signAccessToken(userId: string): string {
  return jwt.sign(
    { sub: userId, type: 'access' },
    process.env.JWT_SECRET as string,
    { expiresIn: '15m', jwtid: uuidv4() },
  );
}

function signRefreshToken(userId: string): string {
  return jwt.sign(
    { sub: userId, type: 'refresh' },
    process.env.JWT_SECRET as string,
    { expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN ?? '7d') as '7d', jwtid: uuidv4() },
  );
}

function signToken(userId: string, res: Response): string {
  const accessToken = signAccessToken(userId);
  const refreshToken = signRefreshToken(userId);
  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/auth',
  });
  return accessToken;
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

async function isRevoked(jti: string | undefined): Promise<boolean> {
  if (!jti) return false;
  const redis = getRedis();
  if (redis.isNoOp) return false;
  try {
    const val = await (redis as RedisClient).get(`revoked:${jti}`);
    return val === '1';
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

  try {
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await pool.query<{ id: string; is_verified: boolean }>(
      'SELECT id, is_verified FROM users WHERE email = $1',
      [normalizedEmail],
    );

    if (existing.rows.length) {
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
        res.status(200).json({ message: 'Your account is awaiting verification. A new verification code has been sent.', userId: existing.rows[0].id, pendingVerification: true });
        return;
      }
      res.status(409).json({ error: 'An account with this email already exists' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const otp = generateOtp();
    const otpHash = hashOtp(otp);
    const otpExpires = new Date(Date.now() + 15 * 60 * 1000);

    const { rows } = await pool.query<{ id: string; email: string }>(
      `INSERT INTO users (email, password_hash, full_name, otp_code, otp_expires)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, email`,
      [normalizedEmail, passwordHash, full_name ?? null, otpHash, otpExpires],
    );

    try {
      await sendOtpEmail(normalizedEmail, otp);
    } catch (err) {
      logger.error({ err: (err as Error).message }, 'OTP email delivery failed');
      res.status(503).json({ error: 'We could not send a verification email. Please try again shortly.', code: 'OTP_DELIVERY_FAILED' });
      return;
    }

    res.status(201).json({ message: 'Registration successful. Check your email for the verification code.', userId: rows[0].id });
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'Register error');
    apiError.serverError(res, 'Registration failed');
  }
});

// ── POST /api/auth/verify-otp ─────────────────────────────────────────────────

router.post('/verify-otp', async (req: Request, res: Response) => {
  const { email, otpCode } = req.body as { email?: string; otpCode?: string };
  if (!email || !otpCode) {
    apiError.validationError(res, 'Email and code are required');
    return;
  }

  try {
    const { rows } = await pool.query<{
      id: string; otp_code: string | null; otp_expires: Date | null;
    }>('SELECT id, otp_code, otp_expires FROM users WHERE email = $1', [email.toLowerCase()]);

    if (!rows.length) {
      apiError.notFound(res, 'User not found');
      return;
    }
    const user = rows[0];

    if (!user.otp_code || !user.otp_expires) {
      apiError.validationError(res, 'No verification code is pending. Request a new code.');
      return;
    }

    if (!verifyOtp(otpCode, user.otp_code)) {
      apiError.validationError(res, 'Invalid verification code');
      return;
    }
    if (new Date() > new Date(user.otp_expires)) {
      apiError.validationError(res, 'Verification code has expired');
      return;
    }

    await pool.query(
      'UPDATE users SET is_verified = TRUE, otp_code = NULL, otp_expires = NULL WHERE id = $1',
      [user.id],
    );

    const token = signToken(user.id, res);
    res.json({ access_token: token });
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

  try {
    const { rows } = await pool.query<{ id: string }>(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()],
    );
    if (!rows.length) {
      apiError.notFound(res, 'User not found');
      return;
    }

    const otp = generateOtp();
    const otpHash = hashOtp(otp);
    const otpExpires = new Date(Date.now() + 15 * 60 * 1000);

    await pool.query(
      'UPDATE users SET otp_code = $1, otp_expires = $2 WHERE id = $3',
      [otpHash, otpExpires, rows[0].id],
    );

    try {
      await sendOtpEmail(email, otp);
    } catch (err) {
      logger.error({ err: (err as Error).message }, 'OTP email resend failed');
      res.status(503).json({ error: 'We could not send a verification email. Please try again shortly.', code: 'OTP_DELIVERY_FAILED' });
      return;
    }

    res.json({ message: 'New verification code sent' });
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'Resend OTP error');
    apiError.serverError(res, 'Failed to resend code');
  }
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────

router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    apiError.validationError(res, 'Email and password are required');
    return;
  }

  try {
    const { rows } = await pool.query<{
      id: string; email: string; password_hash: string | null;
      is_verified: boolean; role: string;
    }>(
      'SELECT id, email, password_hash, is_verified, role FROM users WHERE email = $1',
      [email.toLowerCase()],
    );
    if (!rows.length) {
      // Equalize response time with the known-user path (bcrypt compare) so
      // attackers cannot enumerate registered emails via latency.
      await bcrypt.compare(password, DUMMY_BCRYPT_HASH);
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }
    const user = rows[0];
    if (!user.password_hash) {
      res.status(401).json({ error: 'This account uses Google sign-in' });
      return;
    }
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
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

    const token = signToken(user.id, res);
    res.json({ access_token: token });
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

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload) {
      res.status(401).json({ error: 'Google authentication failed' });
      return;
    }
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
        const { rows } = await pool.query<{ id: string }>(
          `INSERT INTO users (email, full_name, provider, provider_id, is_verified)
           VALUES ($1, $2, 'google', $3, TRUE) RETURNING id`,
          [email.toLowerCase(), name ?? null, googleId],
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

    const token = signToken(user.id, res);
    res.json({ access_token: token });
  } catch (err) {
    logger.error({ err }, 'Google auth error');
    res.status(401).json({ error: 'Google authentication failed' });
  }
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────

router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.email,
              COALESCE(NULLIF(TRIM(u.full_name), ''), up.display_name) AS full_name,
              u.role, u.is_verified, u.created_at
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
    res.json(rows[0]);
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
    await sendPasswordResetEmail(email, token).catch((err: Error) =>
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
    const hash = await bcrypt.hash(password, 12);
    await pool.query(
      'UPDATE users SET password_hash = $1, reset_token = NULL, reset_expires = NULL WHERE id = $2',
      [hash, rows[0].id],
    );
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
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    logger.error({ err }, 'Change password error');
    apiError.serverError(res, 'Failed to change password');
  }
});

// ── POST /api/auth/refresh ────────────────────────────────────────────────────

router.post('/refresh', async (req: Request, res: Response) => {
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

  if (await isRevoked(payload.jti)) {
    res.status(401).json({ error: 'Token has been revoked' });
    return;
  }

  const { rows } = await pool.query<{ id: string }>(
    'SELECT id FROM users WHERE id = $1',
    [payload.sub],
  );
  if (!rows.length) {
    res.status(401).json({ error: 'User not found' });
    return;
  }

  await revokeToken(payload.jti as string, payload.exp as number);
  const accessToken = signToken(payload.sub as string, res);
  res.json({ access_token: accessToken });
});

// ── POST /api/auth/logout ─────────────────────────────────────────────────────

router.post('/logout', async (req: Request, res: Response) => {
  const refreshToken = (req.cookies as Record<string, string | undefined>)?.refresh_token;
  if (refreshToken) {
    try {
      const payload = jwt.verify(refreshToken, process.env.JWT_SECRET as string) as jwt.JwtPayload;
      if (payload.jti) await revokeToken(payload.jti, payload.exp as number);
    } catch { /* already expired */ }
  }
  res.clearCookie('refresh_token', {
    path: '/api/auth',
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  });
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
    path: '/api/auth',
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  });
  res.json({ success: true });
});

module.exports = router;
