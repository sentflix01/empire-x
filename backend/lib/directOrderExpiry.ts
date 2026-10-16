/**
 * lib/directOrderExpiry.ts — Schedules expiry of unconfirmed direct-payment
 * orders (7-day window) for the Real database and, when enabled, the Demo one.
 * Runs where the subscription lifecycle runs: production, or when
 * DIRECT_ORDER_EXPIRY_ENABLED=true.
 */
import logger from './logger';
import { runWithDatabaseEnvironment } from '../db/pool';
import { expireStaleDirectOrders } from '../routes/directOrders';

const INTERVAL_MS = 15 * 60 * 1000;

/** One expiry pass over Real (and Demo when enabled). Also run by POST /api/internal/jobs. */
export async function runDirectOrderExpiry(): Promise<void> {
  const environments: Array<'real' | 'demo'> = ['real'];
  if (process.env.DEMO_ENABLED === 'true' && process.env.DEMO_DATABASE_URL) environments.push('demo');
  for (const environment of environments) {
    try {
      const expired = await runWithDatabaseEnvironment({ environment }, () => expireStaleDirectOrders());
      if (expired) logger.info({ environment, expired }, 'Expired unconfirmed direct orders');
    } catch (err) {
      logger.error({ err: (err as Error).message, environment }, 'Direct order expiry tick failed');
    }
  }
}

export function startDirectOrderExpiry(): void {
  const enabled = process.env.NODE_ENV === 'production' || process.env.DIRECT_ORDER_EXPIRY_ENABLED === 'true';
  if (!enabled) return;
  setInterval(() => { void runDirectOrderExpiry(); }, INTERVAL_MS).unref();
  setTimeout(() => { void runDirectOrderExpiry(); }, 20_000).unref();
}
