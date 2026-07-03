const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { OAuth2Client } = require('google-auth-library');
const pool = require('../db/pool');
const { sendOtpEmail, sendPasswordResetEmail } = require('../utils/mailer');
const { requireAuth } = require('../middleware/auth');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function signToken(userId) {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ── POST /api/auth/register ──────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  const { email, password, full_name } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
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
      `INSERT INTO users (email, password_hash, full_name, otp_code, otp_expires)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, email`,
      [email.toLowerCase(), hash, full_name || null, otp, otpExpires]
    );

    await sendOtpEmail(email, otp).catch(err => {
      console.warn('OTP email failed (check SMTP config):', err.message);
      if (process.env.NODE_ENV !== 'production') {
        console.log(`\n📧 DEV OTP for ${email}: \x1b[33m${otp}\x1b[0m\n`);
      }
    });

    res.status(201).json({ message: 'Registration successful. Check your email for the verification code.', userId: rows[0].id });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// ── POST /api/auth/verify-otp ────────────────────────────────────────────────
router.post('/verify-otp', async (req, res) => {
  const { email, otpCode } = req.body;
  if (!email || !otpCode) {
    return res.status(400).json({ error: 'Email and code are required' });
  }

  try {
    const { rows } = await pool.query(
      'SELECT id, otp_code, otp_expires FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = rows[0];
    if (user.otp_code !== otpCode) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }
    if (new Date() > new Date(user.otp_expires)) {
      return res.status(400).json({ error: 'Verification code has expired' });
    }

    await pool.query(
      'UPDATE users SET is_verified = TRUE, otp_code = NULL, otp_expires = NULL WHERE id = $1',
      [user.id]
    );

    const token = signToken(user.id);
    res.json({ access_token: token });
  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// ── POST /api/auth/resend-otp ────────────────────────────────────────────────
router.post('/resend-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    const { rows } = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (!rows.length) return res.status(404).json({ error: 'User not found' });

    const otp = generateOtp();
    const otpExpires = new Date(Date.now() + 15 * 60 * 1000);

    await pool.query(
      'UPDATE users SET otp_code = $1, otp_expires = $2 WHERE id = $3',
      [otp, otpExpires, rows[0].id]
    );

    await sendOtpEmail(email, otp).catch(err => {
      console.warn('OTP email failed (check SMTP config):', err.message);
      if (process.env.NODE_ENV !== 'production') {
        console.log(`\n📧 DEV OTP for ${email}: \x1b[33m${otp}\x1b[0m\n`);
      }
    });
    res.json({ message: 'New verification code sent' });
  } catch (err) {
    console.error('Resend OTP error:', err);
    res.status(500).json({ error: 'Failed to resend code' });
  }
});

// ── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
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

    const token = signToken(user.id);
    res.json({ access_token: token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ── POST /api/auth/google ────────────────────────────────────────────────────
// Accepts a Google ID token from the frontend and returns a JWT
router.post('/google', async (req, res) => {
  const { id_token } = req.body;
  if (!id_token) return res.status(400).json({ error: 'id_token is required' });

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

    const token = signToken(user.id);
    res.json({ access_token: token });
  } catch (err) {
    console.error('Google auth error:', err);
    res.status(401).json({ error: 'Google authentication failed' });
  }
});

// ── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get('/me', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, email, full_name, role, is_verified, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
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

    await sendPasswordResetEmail(email, token).catch(err => console.error('Reset email failed:', err));
  } catch (err) {
    console.error('Forgot password error:', err);
  }
});

// ── POST /api/auth/reset-password ───────────────────────────────────────────
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) {
    return res.status(400).json({ error: 'Token and new password are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    const { rows } = await pool.query(
      'SELECT id, reset_expires FROM users WHERE reset_token = $1',
      [token]
    );
    if (!rows.length) return res.status(400).json({ error: 'Invalid or expired reset link' });
    if (new Date() > new Date(rows[0].reset_expires)) {
      return res.status(400).json({ error: 'Reset link has expired' });
    }

    const hash = await bcrypt.hash(password, 12);
    await pool.query(
      'UPDATE users SET password_hash = $1, reset_token = NULL, reset_expires = NULL WHERE id = $2',
      [hash, rows[0].id]
    );

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// ── PUT /api/auth/change-password ────────────────────────────────────────────
router.put('/change-password', requireAuth, async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'Both current and new password are required' });
  }

  try {
    const { rows } = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    if (!rows[0].password_hash) {
      return res.status(400).json({ error: 'Cannot change password for OAuth accounts' });
    }
    const match = await bcrypt.compare(current_password, rows[0].password_hash);
    if (!match) return res.status(400).json({ error: 'Current password is incorrect' });

    const hash = await bcrypt.hash(new_password, 12);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.user.id]);
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

module.exports = router;
