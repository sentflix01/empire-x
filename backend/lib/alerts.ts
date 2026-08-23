/**
 * lib/alerts.ts — Threshold evaluator making docs/operations/MONITORING.md real.
 *
 * Pure evaluate(inputs) is unit-tested; assembleInputs(pool) gathers live
 * values (error rate, payment success, backup freshness, redis reachability)
 * for the DevOps health summary. Alert firing itself is surfaced through the
 * console + Telegram when CRITICAL conditions appear (dispatch lives in the
 * devops route so it stays request-scoped and throttled there).
 */
import { getRedis } from './redis';
import type { Redis as RedisClient } from 'ioredis';

export interface AlertInput {
  errorsLastHour: number;
  paymentAttempts24h: number;
  paymentFailures24h: number;
  lastBackupAt: string | Date | null;
  redisConfigured: boolean;
}
export interface Alert { key: string; severity: 'SEV1'|'SEV2'|'SEV3'; message: string }

export function evaluate(i: AlertInput): Alert[] {
  const out: Alert[] = [];
  if (i.errorsLastHour >= 100) out.push({ key: 'error_spike', severity: 'SEV1', message: `${i.errorsLastHour} errors in the last hour — platform-wide incident suspected` });
  else if (i.errorsLastHour >= 50) out.push({ key: 'error_spike', severity: 'SEV2', message: `${i.errorsLastHour} errors in the last hour (threshold 50)` });

  if (i.paymentAttempts24h >= 10) {
    const rate = 1 - i.paymentFailures24h / i.paymentAttempts24h;
    if (rate < 0.9) out.push({ key: 'payment_success', severity: 'SEV1', message: `Payment success ${(rate*100).toFixed(1)}% over 24h (<90%)` });
    else if (rate < 0.95) out.push({ key: 'payment_success', severity: 'SEV2', message: `Payment success ${(rate*100).toFixed(1)}% over 24h (<95% target)` });
  }

  if (i.lastBackupAt) {
    const ageH = (Date.now() - new Date(i.lastBackupAt).getTime()) / 3_600_000;
    if (ageH > 50) out.push({ key: 'backup_stale', severity: 'SEV2', message: `Last successful backup ${ageH.toFixed(0)}h ago (>50h)` });
    else if (ageH > 26) out.push({ key: 'backup_stale', severity: 'SEV3', message: `Last successful backup ${ageH.toFixed(0)}h ago (>26h)` });
  } else {
    out.push({ key: 'backup_missing', severity: 'SEV2', message: 'No successful database backup recorded yet' });
  }

  if (!i.redisConfigured) out.push({ key: 'redis_down', severity: 'SEV3', message: 'Redis unavailable — revocation/rate-limit paths failing open' });
  return out;
}

export async function assembleInputs(pool: import('pg').Pool): Promise<AlertInput> {
  const err = await pool.query(`SELECT COUNT(*)::int AS n FROM error_events WHERE last_seen_at > NOW() - INTERVAL '1 hour'`);
  const pay = await pool.query(
    `SELECT COUNT(*) FILTER (WHERE payload->>'outcome'='paid')::int AS paid,
            COUNT(*) FILTER (WHERE payload->>'outcome'<>'paid')::int AS failed
     FROM telemetry_events
     WHERE type='payment_result' AND created_at > NOW() - INTERVAL '24 hours'`,
  ).catch(() => ({ rows: [{ paid: 0, failed: 0 }] }));
  const bak = await pool.query(`SELECT value FROM app_settings WHERE key='last_database_backup'`).catch(() => ({ rows: [] }));
  const lastBackup = bak.rows[0]?.value?.status === 'ok' ? bak.rows[0]?.value?.at ?? null : null;

  let redisOk = false;
  const redis = getRedis();
  if (!redis.isNoOp) {
    try { await (redis as RedisClient).ping(); redisOk = true; } catch { redisOk = false; }
  }
  return {
    errorsLastHour: err.rows[0]?.n ?? 0,
    paymentAttempts24h: (pay.rows[0]?.paid ?? 0) + (pay.rows[0]?.failed ?? 0),
    paymentFailures24h: pay.rows[0]?.failed ?? 0,
    lastBackupAt: lastBackup,
    redisConfigured: redisOk,
  };
}
