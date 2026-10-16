/**
 * lib/authSecurityStore.ts — durable state for sign-in security controls.
 *
 * OTP attempt limits, login lockout and refresh-token revocation used to live
 * only in Redis, and silently stopped working whenever Redis was unavailable
 * (production /health has reported "connecting"). They now live in Postgres
 * (`auth_security_state`, migrate60), which is always there. These paths run a
 * few times per user session, so the extra query is cheap. Redis keeps a copy
 * of revocations so the per-request access-token check in middleware/auth.ts
 * stays fast.
 *
 * Every row expires; the `auth-state-cleanup` scheduled job deletes old rows.
 */
import pool from '../db/pool';
import logger from './logger';
import { getRedis } from './redis';
import type { Redis as RedisClient } from 'ioredis';

const SEVEN_DAYS = 7 * 24 * 60 * 60;

/** Adds one to a counter that resets after `ttlSeconds`; returns the new count. */
export async function incrementCounter(key: string, ttlSeconds: number): Promise<number> {
  const { rows } = await pool.query<{ count: string }>(
    `INSERT INTO auth_security_state (key, count, expires_at)
     VALUES ($1, 1, NOW() + make_interval(secs => $2))
     ON CONFLICT (key) DO UPDATE SET
       count = CASE WHEN auth_security_state.expires_at <= NOW() THEN 1 ELSE auth_security_state.count + 1 END,
       expires_at = CASE WHEN auth_security_state.expires_at <= NOW() THEN EXCLUDED.expires_at ELSE auth_security_state.expires_at END
     RETURNING count`,
    [key, ttlSeconds],
  );
  return Number(rows[0].count);
}

/** Stores `value` under `key` for `ttlSeconds`. */
export async function setValue(key: string, value: number, ttlSeconds: number): Promise<void> {
  await pool.query(
    `INSERT INTO auth_security_state (key, count, expires_at)
     VALUES ($1, $2, NOW() + make_interval(secs => $3))
     ON CONFLICT (key) DO UPDATE SET count = EXCLUDED.count, expires_at = EXCLUDED.expires_at`,
    [key, value, ttlSeconds],
  );
}

/** The value under `key`, or null when it is missing or expired. */
export async function getValue(key: string): Promise<number | null> {
  const { rows } = await pool.query<{ count: string }>(
    'SELECT count FROM auth_security_state WHERE key = $1 AND expires_at > NOW()',
    [key],
  );
  return rows.length ? Number(rows[0].count) : null;
}

export async function clearValue(key: string): Promise<void> {
  await pool.query('DELETE FROM auth_security_state WHERE key = $1', [key]);
}

/** Best-effort copy to Redis for the fast access-token check. */
async function mirrorToRedis(key: string, ttlSeconds: number, value: string): Promise<void> {
  const redis = getRedis();
  if (redis.isNoOp) return;
  try {
    await (redis as RedisClient).setex(key, ttlSeconds, value);
  } catch {
    logger.warn({ key: key.split(':')[0] }, 'auth: Redis copy of a revocation failed; Postgres still holds it');
  }
}

/** Revokes one refresh token until it would have expired anyway. */
export async function revokeTokenId(jti: string, expiresAtUnix: number): Promise<void> {
  const ttl = Math.max(1, Math.ceil(expiresAtUnix - Date.now() / 1000));
  await setValue(`revoked:${jti}`, 1, ttl);
  await mirrorToRedis(`revoked:${jti}`, ttl, '1');
}

/** Revokes every token issued to the user before now (logout-all, password change, deletion). */
export async function revokeAllSessions(userId: string): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  await setValue(`revoke_before:${userId}`, now, SEVEN_DAYS);
  await mirrorToRedis(`revoke_before:${userId}`, SEVEN_DAYS, String(now));
}

/** True when the token was revoked by id or issued before a revoke-all. */
export async function isTokenRevoked(jti: string | undefined, userId: string | undefined, issuedAtUnix: number | undefined): Promise<boolean> {
  if (jti && (await getValue(`revoked:${jti}`)) !== null) return true;
  if (userId && issuedAtUnix !== undefined) {
    const before = await getValue(`revoke_before:${userId}`);
    if (before !== null && issuedAtUnix < before) return true;
  }
  return false;
}

/** Deletes expired rows; run by the auth-state-cleanup scheduled job. */
export async function deleteExpiredAuthState(): Promise<{ deleted: number }> {
  const { rowCount } = await pool.query('DELETE FROM auth_security_state WHERE expires_at <= NOW()');
  return { deleted: rowCount ?? 0 };
}
