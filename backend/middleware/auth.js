const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const { getRedis } = require('../lib/redis');

/**
 * Check whether a JTI has been revoked OR was issued before the user's
 * per-account revoke_before timestamp (set by logout-all).
 * Fails open (returns false) when Redis is unavailable.
 */
async function isTokenRevoked(jti, userId, iat) {
  const redis = getRedis();
  if (redis.isNoOp) return false;
  try {
    // Check per-JTI revocation
    if (jti) {
      const revoked = await redis.get(`revoked:${jti}`);
      if (revoked === '1') return true;
    }
    // Check per-user revoke_before (logout-all)
    if (userId) {
      const revokeBefore = await redis.get(`revoke_before:${userId}`);
      if (revokeBefore && iat && iat < parseInt(revokeBefore, 10)) return true;
    }
    return false;
  } catch {
    return false; // fail open
  }
}

/**
 * Verifies the Bearer JWT, checks the revocation list, and attaches
 * req.user = { id, email, role }
 */
async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const token = header.slice(7);
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // TD-005: check revocation blocklist
    if (await isTokenRevoked(payload.jti, payload.sub, payload.iat)) {
      return res.status(401).json({ error: 'Token has been revoked' });
    }

    // Confirm user still exists
    const { rows } = await pool.query(
      'SELECT id, email, role FROM users WHERE id = $1',
      [payload.sub]
    );
    if (!rows.length) {
      return res.status(401).json({ error: 'User not found' });
    }
    req.user = rows[0];
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

/**
 * Optional auth — attaches req.user if token present, otherwise continues
 */
async function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }
  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const { rows } = await pool.query(
      'SELECT id, email, role FROM users WHERE id = $1',
      [payload.sub]
    );
    req.user = rows[0] || null;
  } catch {
    req.user = null;
  }
  next();
}

/**
 * Requires the admin role
 */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

module.exports = { requireAuth, optionalAuth, requireAdmin };
