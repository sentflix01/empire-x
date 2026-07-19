const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { OAuth2Client } = require('google-auth-library');
const pool = require('../db/pool');
const { sendOtpEmail, sendPasswordResetEmail } = require('../utils/mailer');
const { requireAuth } = require('../middleware/auth');
const { getRedis } = require('../lib/redis');
const apiError = require('../lib/apiError');
const logger = require('../lib/logger');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Short-lived access token (15 min) — sent in response body, stored in memory
function signAccessToken(userId) {
  return jwt.sign({ sub: userId, type: 'access' }, process.env.JWT_SECRET, {
    expiresIn: '15m',
    jwtid: uuidv4(),
  });
}

// Long-lived refresh token (7 days) — sent as HttpOnly cookie only
function signRefreshToken(userId) {
  return jwt.sign({ sub: userId, type: 'refresh' }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    jwtid: uuidv4(),
  });
}

// Legacy helper — keeps existing callers working during migration
// Returns short-lived access token; also sets HttpOnly refresh cookie when res provided
function signToken(userId, res) {
  const accessToken = signAccessToken(userId);
  if (res) {
    const refreshToken = signRefreshToken(userId);
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days ms
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge,
      path: '/api/auth',
    });
  }
  return accessToken;
}

// ── TD-005: JWT revocation blocklist ─────────────────────────────────────────
// Revoked JTIs are stored in Redis with TTL matching the token expiry.
// Falls back to allowing the token when Redis is unavailable (fail open for UX).

async function revokeToken(jti, expiresAt) {
  const redis = getRedis();
  if (redis.isNoOp) return; // no Redis — skip silently
  const ttl = Math.max(1, Math.ceil((new Date(expiresAt * 1000) - Date.now()) / 1000));
  try {
    await redis.setex(`revoked:${jti}`, ttl, '1');
  } catch {
    // non-fatal — log but continue
    require('../lib/logger').warn({ jti }, 'auth: failed to write revocation to Redis');
  }
}

async function isRevoked(jti) {
  if (!jti) return false;
  const redis = getRedis();
  if (redis.isNoOp) return false;
  try {
    const val = await redis.get(`revoked:${jti}`);
    return val === '1';
  } catch {
    return false; // fail open
  }
}

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ── POST /api/auth/register ──────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  const { email, password, full_name } = req.body;
  if (!email || !password) {
    return apiError.validationError(res, 'Email and password are required');
  }
  if (password.length < 6) {
    return apiError.validationError(res, 'Password must be at least 6 characters');
  }

  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const hash = await bcrypt.hash(password, 12);
    const otp = generateOtp();
    const otpExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    const { rows } = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, is_seed, otp_code, otp_expires)
       VALUES ($1, $2, $3, FALSE, $4, $5) RETURNING id, email`,
      [email.toLowerCase(), hash, full_name || null, otp, otpExpires]
    );

    await sendOtpEmail(email, otp).catch(err => {
      logger.warn({ err: err.message }, 'OTP email failed (check SMTP config)');
      if (process.env.NODE_ENV !== 'production') {
        console.log(`\n📧 DEV OTP for ${email}: \x1b[33m${otp}\x1b[0m\n`);
      }
    });

    res.status(201).json({ message: 'Registration successful. Check your email for the verification code.', userId: rows[0].id });
  } catch (err) {
    logger.error({ err: err.message }, 'Register error');
    return apiError.serverError(res, 'Registration failed');
  }
});

// ── POST /api/auth/verify-otp ────────────────────────────────────────────────
router.post('/verify-otp', async (req, res) => {
  const { email, otpCode } = req.body;
  if (!email || !otpCode) {
    return apiError.validationError(res, 'Email and code are required');
  }

  try {
    const { rows } = await pool.query(
      'SELECT id, otp_code, otp_expires FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    if (!rows.length) {
      return apiError.notFound(res, 'User not found');
    }
    const user = rows[0];
    if (user.otp_code !== otpCode) {
      return apiError.validationError(res, 'Invalid verification code');
    }
    if (new Date() > new Date(user.otp_expires)) {
      return apiError.validationError(res, 'Verification code has expired');
    }

    await pool.query(
      'UPDATE users SET is_verified = TRUE, otp_code = NULL, otp_expires = NULL WHERE id = $1',
      [user.id]
    );

    const token = signToken(user.id, res);
    res.json({ access_token: token });
  } catch (err) {
    logger.error({ err: err.message }, 'Verify OTP error');
    return apiError.serverError(res, 'Verification failed');
  }
});

// ── POST /api/auth/resend-otp ────────────────────────────────────────────────
router.post('/resend-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) return apiError.validationError(res, 'Email is required');

  try {
    const { rows } = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (!rows.length) return apiError.notFound(res, 'User not found');

    const otp = generateOtp();
    const otpExpires = new Date(Date.now() + 15 * 60 * 1000);

    await pool.query(
      'UPDATE users SET otp_code = $1, otp_expires = $2 WHERE id = $3',
      [otp, otpExpires, rows[0].id]
    );

    await sendOtpEmail(email, otp).catch(err => {
      logger.warn({ err: err.message }, 'OTP email failed (check SMTP config)');
      if (process.env.NODE_ENV !== 'production') {
        console.log(`\n📧 DEV OTP for ${email}: \x1b[33m${otp}\x1b[0m\n`);
      }
    });
    res.json({ message: 'New verification code sent' });
  } catch (err) {
    logger.error({ err: err.message }, 'Resend OTP error');
    return apiError.serverError(res, 'Failed to resend code');
  }
});

// ── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return apiError.validationError(res, 'Email and password are required');
  }

  try {
    const { rows } = await pool.query(
      'SELECT id, email, password_hash, is_verified, role FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    if (!rows.length) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const user = rows[0];
    if (!user.password_hash) {
      return res.status(401).json({ error: 'This account uses Google sign-in' });
    }
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    if (!user.is_verified) {
      return res.status(403).json({ error: 'Please verify your email before logging in', code: 'email_not_verified' });
    }

    const token = signToken(user.id, res);
    res.json({ access_token: token });
  } catch (err) {
    logger.error({ err: err.message }, 'Login error');
    return apiError.serverError(res, 'Login failed');
  }
});

// ── POST /api/auth/google ────────────────────────────────────────────────────
// Accepts a Google ID token from the frontend and returns a JWT
router.post('/google', async (req, res) => {
  const { id_token } = req.body;
  if (!id_token) return apiError.validationError(res, 'id_token is required');

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { sub: googleId, email, name } = payload;

    // Find or create user
    let user = (await pool.query('SELECT id FROM users WHERE provider = $1 AND provider_id = $2', ['google', googleId])).rows[0];

    if (!user) {
      // Check if email already registered locally
      const existing = (await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()])).rows[0];
      if (existing) {
        // Link Google to existing account
        await pool.query(
          'UPDATE users SET provider = $1, provider_id = $2, is_verified = TRUE WHERE id = $3',
          ['google', googleId, existing.id]
        );
        user = existing;
      } else {
        const { rows } = await pool.query(
          `INSERT INTO users (email, full_name, provider, provider_id, is_verified)
           VALUES ($1, $2, 'google', $3, TRUE) RETURNING id`,
          [email.toLowerCase(), name || null, googleId]
        );
        user = rows[0];
      }
    }

    const token = signToken(user.id, res);
    res.json({ access_token: token });
  } catch (err) {
    logger.error({ err }, 'Google auth error');
    return res.status(401).json({ error: 'Google authentication failed' });
  }
});

// ── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get('/me', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, email, full_name, role, is_verified, is_seed, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (!rows.length) return apiError.notFound(res, 'User not found');
    res.json(rows[0]);
  } catch (err) {
    logger.error({ err }, 'Me error');
    return apiError.serverError(res, 'Failed to fetch user');
  }
});

// ── POST /api/auth/forgot-password ──────────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  // Always respond success to avoid user enumeration
  res.json({ message: 'If an account exists, a reset link has been sent.' });

  if (!email) return;
  try {
    const { rows } = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (!rows.length) return;

    const token = uuidv4();
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await pool.query(
      'UPDATE users SET reset_token = $1, reset_expires = $2 WHERE id = $3',
      [token, expires, rows[0].id]
    );

    await sendPasswordResetEmail(email, token).catch(err => logger.error({ err }, 'Reset email failed'));
  } catch (err) {
    logger.error({ err }, 'Forgot password error');
  }
});

// ── POST /api/auth/reset-password ───────────────────────────────────────────
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) {
    return apiError.validationError(res, 'Token and new password are required');
  }
  if (password.length < 6) {
    return apiError.validationError(res, 'Password must be at least 6 characters');
  }

  try {
    const { rows } = await pool.query(
      'SELECT id, reset_expires FROM users WHERE reset_token = $1',
      [token]
    );
    if (!rows.length) return apiError.validationError(res, 'Invalid or expired reset link');
    if (new Date() > new Date(rows[0].reset_expires)) {
      return apiError.validationError(res, 'Reset link has expired');
    }

    const hash = await bcrypt.hash(password, 12);
    await pool.query(
      'UPDATE users SET password_hash = $1, reset_token = NULL, reset_expires = NULL WHERE id = $2',
      [hash, rows[0].id]
    );

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    logger.error({ err }, 'Reset password error');
    return apiError.serverError(res, 'Failed to reset password');
  }
});

// ── PUT /api/auth/change-password ────────────────────────────────────────────
router.put('/change-password', requireAuth, async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) {
    return apiError.validationError(res, 'Both current and new password are required');
  }

  try {
    const { rows } = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    if (!rows[0].password_hash) {
      return apiError.validationError(res, 'Cannot change password for OAuth accounts');
    }
    const match = await bcrypt.compare(current_password, rows[0].password_hash);
    if (!match) return apiError.validationError(res, 'Current password is incorrect');

    const hash = await bcrypt.hash(new_password, 12);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.user.id]);
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    logger.error({ err }, 'Change password error');
    return apiError.serverError(res, 'Failed to change password');
  }
});

// ── POST /api/auth/refresh ───────────────────────────────────────────────────
// Reads the HttpOnly refresh_token cookie; issues a new short-lived access token
// and rotates the refresh cookie. No request body needed.
router.post('/refresh', async (req, res) => {
  const refreshToken = req.cookies?.refresh_token;
  if (!refreshToken) {
    return res.status(401).json({ error: 'No refresh token' });
  }

  let payload;
  try {
    payload = jwt.verify(refreshToken, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }

  if (payload.type !== 'refresh') {
    return res.status(401).json({ error: 'Invalid token type' });
  }

  // Check revocation list
  if (await isRevoked(payload.jti)) {
    return res.status(401).json({ error: 'Token has been revoked' });
  }

  // Confirm user still exists
  const { rows } = await pool.query('SELECT id FROM users WHERE id = $1', [payload.sub]);
  if (!rows.length) {
    return res.status(401).json({ error: 'User not found' });
  }

  // Rotate: revoke old refresh token and issue new pair
  await revokeToken(payload.jti, payload.exp);
  const accessToken = signToken(payload.sub, res); // sets new refresh cookie

  res.json({ access_token: accessToken });
});

// ── POST /api/auth/logout ────────────────────────────────────────────────────
// Revokes the current refresh token and clears the cookie.
router.post('/logout', async (req, res) => {
  const refreshToken = req.cookies?.refresh_token;
  if (refreshToken) {
    try {
      const payload = jwt.verify(refreshToken, process.env.JWT_SECRET);
      if (payload.jti) await revokeToken(payload.jti, payload.exp);
    } catch {
      // Token already expired — no need to revoke
    }
  }
  res.clearCookie('refresh_token', {
    path: '/api/auth',
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  });
  res.json({ success: true });
});

// ── POST /api/auth/logout-all ────────────────────────────────────────────────
// Revokes the current refresh token AND invalidates all active access tokens
// for the user by storing a "revoke_before" timestamp in Redis.
// Any access token issued before this timestamp will be rejected.
router.post('/logout-all', requireAuth, async (req, res) => {
  const refreshToken = req.cookies?.refresh_token;
  if (refreshToken) {
    try {
      const payload = jwt.verify(refreshToken, process.env.JWT_SECRET);
      if (payload.jti) await revokeToken(payload.jti, payload.exp);
    } catch {
      // ignore
    }
  }

  // Store a per-user "revoke_before" epoch so all tokens issued before now
  // are treated as revoked — this is the "logout all devices" mechanism.
  const redis = getRedis();
  if (!redis.isNoOp) {
    try {
      const ttl = 7 * 24 * 60 * 60; // 7 days — matches max token lifetime
      await redis.setex(`revoke_before:${req.user.id}`, ttl, Math.floor(Date.now() / 1000).toString());
    } catch {
      // non-fatal
    }
  }

  res.clearCookie('refresh_token', {
    path: '/api/auth',
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  });
  res.json({ success: true });
});

module.exports = router;
