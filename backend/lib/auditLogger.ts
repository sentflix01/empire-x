import pool from '../db/pool';
import logger from './logger';

export interface AuditEntry {
  actor_id?: string | null;
  actor_email?: string | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  amount?: number | null;
  currency?: string;
  balance_before?: number | null;
  balance_after?: number | null;
  metadata?: Record<string, unknown>;
  ip_address?: string | null;
  user_agent?: string | null;
}

export async function auditLog(entry: AuditEntry): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO audit_logs (actor_id, actor_email, action, entity_type, entity_id, amount, currency, balance_before, balance_after, metadata, ip_address, user_agent)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        entry.actor_id ?? null,
        entry.actor_email ?? null,
        entry.action,
        entry.entity_type,
        entry.entity_id ?? null,
        entry.amount ?? null,
        entry.currency ?? 'ETB',
        entry.balance_before ?? null,
        entry.balance_after ?? null,
        JSON.stringify(entry.metadata ?? {}),
        entry.ip_address ?? null,
        entry.user_agent ?? null,
      ],
    );
  } catch (err) {
    // Audit logging must never break the request
    logger.warn({ err }, 'auditLog: failed to write audit entry');
  }
}
