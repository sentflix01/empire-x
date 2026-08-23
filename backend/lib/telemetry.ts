/**
 * lib/telemetry.ts — Structured event ledger (DevOps catches-everything layer)
 *
 * recordEvent(): fire-and-forget insert into telemetry_events (migrate34).
 * Never throws into business paths — a telemetry failure must not break a
 * payment. Query helpers power the DevOps health summary and console.
 */
import type { Pool } from 'pg';
import logger from './logger';

export type TelemetryLevel = 'info' | 'warn' | 'error' | 'critical';

let _pool: Pool | null = null;
function getPool(): Pool {
  if (!_pool) _pool = require('../db/pool') as Pool;
  return _pool;
}

export interface RecordOptions {
  level?: TelemetryLevel;
  source?: 'server' | 'client' | 'worker';
  payload?: Record<string, unknown>;
}

/** Fire-and-forget structured event. Safe to call without await. */
export function recordEvent(
  type: string,
  payload: Record<string, unknown> = {},
  opts: RecordOptions = {},
): void {
  const level = opts.level ?? 'info';
  const source = opts.source ?? 'server';
  getPool()
    .query(
      'INSERT INTO telemetry_events (type, level, source, payload) VALUES ($1,$2,$3,$4)',
      [type.slice(0, 64), level, source, JSON.stringify(payload)],
    )
    .catch((err: Error) => {
      if ((err as { code?: string }).code !== '42P01') {
        logger.warn({ err: err.message, type }, 'telemetry: insert failed');
      }
    });
}

export async function typeCountsSince(hours: number): Promise<Array<{ type: string; count: string; errors: string }>> {
  const { rows } = await getPool().query(
    `SELECT type, COUNT(*) AS count,
            COUNT(*) FILTER (WHERE level IN ('error','critical')) AS errors
     FROM telemetry_events
     WHERE created_at > NOW() - ($1 || ' hours')::interval
     GROUP BY type ORDER BY count DESC LIMIT 25`,
    [String(hours)],
  );
  return rows as Array<{ type: string; count: string; errors: string }>;
}

export async function recentEvents(type: string | null, limit = 100): Promise<unknown[]> {
  const { rows } = type
    ? await getPool().query(
        'SELECT id,type,level,source,payload,created_at FROM telemetry_events WHERE type=$1 ORDER BY created_at DESC LIMIT $2',
        [type, limit],
      )
    : await getPool().query(
        'SELECT id,type,level,source,payload,created_at FROM telemetry_events ORDER BY created_at DESC LIMIT $1',
        [limit],
      );
  return rows;
}
