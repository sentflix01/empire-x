import { Router } from 'express';
import type { Request, Response } from 'express';
import pool from '../db/pool';
import { requireAuth, requireAdmin, optionalAuth } from '../middleware/auth';
import { captureError } from '../lib/errorCollector';
import logger from '../lib/logger';

const router = Router();

// ── DevOps Items ──────────────────────────────────────────────────────────────

router.get('/', requireAuth, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query('SELECT * FROM devops_items ORDER BY created_at DESC LIMIT 200');
    res.json(rows);
  } catch { res.status(500).json({ error: 'Failed to fetch DevOps items' }); }
});

router.post('/', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const { kind, title, description, severity, status, tags, assigned_to } = req.body as Record<string, unknown>;
  if (!kind || !title) { res.status(400).json({ error: 'kind and title are required' }); return; }
  try {
    const { rows } = await pool.query(
      `INSERT INTO devops_items (kind,title,description,severity,status,tags,assigned_to,created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [kind, title, description ?? null, severity ?? 'attention', status ?? 'open', tags ?? null, assigned_to ?? null, req.user!.id],
    );
    res.status(201).json(rows[0]);
  } catch { res.status(500).json({ error: 'Failed to create DevOps item' }); }
});

// Admin-updatable columns for devops_items. Never build SET clauses from raw
// request keys — JSON body keys are attacker-controlled strings.
const DEVOPS_ITEM_FIELDS = new Set(['kind', 'title', 'description', 'severity', 'status', 'tags', 'assigned_to']);

router.put('/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const fields = req.body as Record<string, unknown>;
    const keys = Object.keys(fields).filter((k) => DEVOPS_ITEM_FIELDS.has(k));
    if (!keys.length) { res.status(400).json({ error: 'No fields to update' }); return; }
    const values = keys.map((k) => fields[k]);
    const resolving = (fields as { status?: string }).status === 'resolved';
    const sets = keys.map((k, i) => `${k}=$${i + 1}`).join(', ');
    // resolved_at must be part of the SQL string — String.concat() is a no-op
    // and previously left resolved_at permanently NULL.
    const { rows } = await pool.query(
      `UPDATE devops_items SET ${sets}${resolving ? ', resolved_at=NOW()' : ''},updated_at=NOW() WHERE id=$${keys.length + 1} RETURNING *`,
      [...values, req.params.id],
    );
    if (!rows.length) { res.status(404).json({ error: 'Item not found' }); return; }
    res.json(rows[0]);
  } catch { res.status(500).json({ error: 'Failed to update DevOps item' }); }
});

router.delete('/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    await pool.query('DELETE FROM devops_items WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Failed to delete DevOps item' }); }
});

// ── Error Events ──────────────────────────────────────────────────────────────

router.get('/errors', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { resolved = 'false', level, limit = '50', offset = '0' } = req.query as Record<string, string>;
    const conditions: string[] = [`resolved=$1`];
    const values: unknown[] = [resolved === 'true'];
    if (level) { values.push(level); conditions.push(`level=$${values.length}`); }
    values.push(parseInt(limit)); values.push(parseInt(offset));
    const { rows } = await pool.query(
      `SELECT * FROM error_events WHERE ${conditions.join(' AND ')} ORDER BY last_seen_at DESC LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values,
    );
    res.json(rows);
  } catch { res.status(500).json({ error: 'Failed to fetch error events' }); }
});

router.put('/errors/:id/resolve', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const { note } = req.body as { note?: string };
  try {
    const { rows } = await pool.query(
      `UPDATE error_events SET resolved=TRUE,resolved_at=NOW(),resolved_by=$1,resolution_note=$2 WHERE id=$3 RETURNING id`,
      [req.user!.id, note ?? null, req.params.id],
    );
    if (!rows.length) { res.status(404).json({ error: 'Error event not found' }); return; }
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Failed to resolve error' }); }
});

// Frontend error reporting (rate-limited in index.js, no auth required)
router.post('/errors/report', optionalAuth, async (req: Request, res: Response) => {
  res.status(202).json({ received: true });
  const { message, stack, source, level = 'error', path, context } = req.body as Record<string, unknown>;
  if (!message) return;
  const err = Object.assign(new Error(String(message)), { stack: stack as string | undefined });
  captureError(err, {
    req: req as Request,
    level: level as 'error',
    source: 'client',
    context: typeof context === 'object' && context !== null ? context as Record<string, unknown> : {},
  }).catch(() => undefined);
});

// ── Version board ─────────────────────────────────────────────────────────────

router.get('/versions', async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(`SELECT value FROM app_settings WHERE key='devops_version_statuses'`);
    res.json(rows[0]?.value ?? {});
  } catch { res.json({}); }
});

router.put('/versions', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    await pool.query(
      `INSERT INTO app_settings (key,value) VALUES ('devops_version_statuses',$1) ON CONFLICT (key) DO UPDATE SET value=$1,updated_at=NOW()`,
      [JSON.stringify(req.body)],
    );
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Failed to update versions' }); }
});

// ── Observability: health summary + telemetry (DevOps catches-everything) ────

import { assembleInputs, evaluate } from '../lib/alerts';
import { typeCountsSince, recentEvents, recordEvent } from '../lib/telemetry';

router.get('/health-summary', requireAuth, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const inputs = await assembleInputs(pool);
    const alerts = evaluate(inputs);
    const critical = alerts.filter((a) => a.severity === 'SEV1');

    // SEV1 → Telegram page to the first admin, throttled to one send per
    // alert-key per hour (claim row doubles as the throttle + audit trail).
    for (const a of critical) {
      const throttleKey = `alert_dispatch:${a.key}:${new Date().toISOString().slice(0, 13)}`;
      const claim = await pool.query(
        `INSERT INTO app_settings (key,value) VALUES ($1,'1') ON CONFLICT (key) DO NOTHING RETURNING key`,
        [throttleKey],
      );
      if (claim.rows.length) {
        try {
          const admin = await pool.query(`SELECT id FROM users WHERE role='admin' ORDER BY created_at LIMIT 1`);
          if (admin.rows[0]) {
            const { notifyUser } = await import('./telegram');
            notifyUser(String(admin.rows[0].id), `🚨 <b>${a.severity} ALERT — Nodbusiness</b>\n${a.message}\n\nConsole: /admin/devops → System Health`).catch(() => undefined);
            recordEvent('alert_dispatched', { key: a.key, severity: a.severity, message: a.message }, { level: 'critical' });
          }
        } catch { /* dispatch is best-effort */ }
      }
    }
    res.json({
      status: critical.length ? 'critical' : alerts.some((a) => a.severity === 'SEV2') ? 'degraded' : 'healthy',
      generated_at: new Date().toISOString(),
      db: { totalCount: pool.totalCount, idleCount: pool.idleCount, waitingCount: pool.waitingCount },
      inputs,
      alerts,
    });
  } catch { res.status(500).json({ error: 'Failed to build health summary' }); }
});

router.get('/telemetry', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { type, hours = '24', limit = '100' } = req.query as Record<string, string>;
    const [counts, events] = await Promise.all([
      typeCountsSince(Math.min(parseInt(hours) || 24, 720)),
      recentEvents(type ?? null, Math.min(parseInt(limit) || 100, 500)),
    ]);
    res.json({ counts, events });
  } catch { res.status(500).json({ error: 'Failed to fetch telemetry' }); }
});

import { parseIntent, COPILOT_HELP, CopilotIntent } from '../lib/copilot';

// ── Ops Copilot: chat-driven operations (whitelisted intents only) ───────────

async function executeIntent(intent: CopilotIntent): Promise<{ reply: string; data?: unknown; action: string }> {
  switch (intent.intent) {
    case 'help':
      return { reply: COPILOT_HELP, action: 'help' };

    case 'health': {
      const inputs = await assembleInputs(pool);
      const alerts = evaluate(inputs);
      const status = alerts.some((a) => a.severity === 'SEV1') ? 'critical'
        : alerts.some((a) => a.severity === 'SEV2') ? 'degraded' : 'healthy';
      return {
        reply: `Status: **${status}** · errors/hr ${inputs.errorsLastHour} · payments 24h ${inputs.paymentAttempts24h} · redis ${inputs.redisConfigured ? 'up' : 'DOWN'}${alerts.length ? '\n\n⚠️ ' + alerts.map((a) => `${a.severity}: ${a.message}`).join('\n⚠️ ') : '\n✓ No alerts'}`,
        data: { inputs, alerts }, action: 'health',
      };
    }

    case 'errors': {
      const { rows } = await pool.query(
        `SELECT fingerprint, SUM(occurrence) total, MAX(message) msg, MAX(path) path
         FROM error_events WHERE resolved=false AND last_seen_at > NOW() - ($1 || ' hours')::interval
         GROUP BY fingerprint ORDER BY total DESC LIMIT 10`, [String(intent.hours)],
      );
      if (!rows.length) return { reply: `✓ No unresolved errors in the last ${intent.hours}h.`, action: 'errors' };
      return {
        reply: rows.map((r: any) => `\`${r.fingerprint.slice(0, 8)}\` ${r.total}x [${r.path ?? '-'}] ${String(r.msg).slice(0, 80)}`).join('\n') + `\n\nResolve with: \`/resolve <fingerprint>\``,
        data: rows, action: 'errors',
      };
    }

    case 'resolve': {
      const fp = intent.fingerprint;
      const { rows } = await pool.query(
        `UPDATE error_events SET resolved=true, resolved_at=NOW() WHERE (fingerprint=$1 OR fingerprint::text LIKE $2) AND resolved=false RETURNING id`,
        [fp, fp + '%'],
      );
      return rows.length
        ? { reply: `✅ Resolved ${rows.length} error event(s) matching \`${fp}\`.`, action: 'resolve' }
        : { reply: `No unresolved errors matching \`${fp}\`. Use \`/errors\` to list fingerprints.`, action: 'resolve' };
    }

    case 'flags': {
      const { getAllFlags } = await import('../lib/featureFlags');
      const flags = await getAllFlags();
      const lines = Object.entries(flags).map(([n, f]) => `${f.effective ? '🟢' : '⚪'} \`${n}\``);
      return { reply: lines.join('\n') || 'No flags registered.', data: flags, action: 'flags' };
    }

    case 'flag_set': {
      const { setFlag } = await import('../lib/featureFlags');
      const ok = await setFlag(intent.flag, intent.enabled).catch(() => false);
      return ok
        ? { reply: `✅ Flag \`${intent.flag}\` → **${intent.enabled ? 'ON' : 'OFF'}** (live, no redeploy).`, action: 'flag_set' }
        : { reply: `⚠️ Could not flip \`${intent.flag}\` — Redis not configured. Use \`FF_${intent.flag.toUpperCase()}=false\` env var (triggers redeploy).`, action: 'flag_set' };
    }

    case 'telemetry': {
      const counts = await typeCountsSince(24);
      const filtered = intent.type ? counts.filter((c) => c.type.includes(intent.type!)) : counts;
      if (!filtered.length) return { reply: 'No telemetry events in the last 24h.', action: 'telemetry' };
      return {
        reply: filtered.slice(0, 15).map((c) => `\`${c.type}\` × ${c.count}${Number(c.errors) ? ` (⚠${c.errors} err)` : ''}`).join('\n'),
        data: filtered, action: 'telemetry',
      };
    }

    case 'backup': {
      const { runBackup } = require('../scripts/backup-database') as { runBackup: () => Promise<unknown> };
      runBackup().catch(() => undefined);
      return { reply: '🗄️ Backup started — I will record the outcome in telemetry. Check `/telemetry backup` in a minute.', action: 'backup' };
    }

    case 'items': {
      const { rows } = await pool.query(
        `SELECT id,kind,status,severity,title FROM devops_items ${intent.open ? "WHERE status IN ('open','in_progress','blocked','planned')" : ''} ORDER BY created_at DESC LIMIT 20`,
      );
      if (!rows.length) return { reply: 'Board is clear. 🎉', action: 'items' };
      return { reply: rows.map((r: any) => `\`${r.id.slice(0, 8)}\` [${r.status}/${r.kind}] ${r.title}`).join('\n'), data: rows, action: 'items' };
    }

    case 'add_item': {
      const { rows } = await pool.query(
        `INSERT INTO devops_items (kind,title,description,status) VALUES ($1,$2,$3,'open') RETURNING id`,
        [intent.kind, intent.title.slice(0, 200), intent.description || null],
      );
      return { reply: `✅ ${intent.kind} added to the board: **${intent.title}** (\`${rows[0].id.slice(0, 8)}\`)`, data: rows[0], action: 'add_item' };
    }

    case 'unknown': {
      return { reply: 'Unrecognised command.', action: 'unknown' };
    }

    case 'done_item': {
      const { rows } = await pool.query(
        `UPDATE devops_items SET status='done', resolved_at=NOW(), updated_at=NOW()
         WHERE status <> 'done' AND (title ILIKE $1 OR id::text LIKE $2) RETURNING id, title`,
        ['%' + intent.query + '%', intent.query + '%'],
      );
      return rows.length
        ? { reply: `✅ Closed ${rows.length} item(s):\n` + rows.map((r: any) => `- ${r.title}`).join('\n'), action: 'done_item' }
        : { reply: `No open items matching \`${intent.query}\`. Use \`/items\` to list.`, action: 'done_item' };
    }
  }
}

router.post('/copilot', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const { message } = req.body as { message?: string };
  if (!message || typeof message !== 'string') { res.status(422).json({ error: 'message is required' }); return; }
  const intent = parseIntent(message);
  if (intent.intent === 'unknown') {
    res.json({
      reply: "I didn't recognise that command.\n\n" + COPILOT_HELP,
      action: 'unknown',
    });
    return;
  }
  try {
    const result = await executeIntent(intent);
    recordEvent('copilot_command', { intent: intent.intent, message: message.slice(0, 200) });
    res.json(result);
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'copilot: execution failed');
    res.status(500).json({ reply: `Execution failed: ${(err as Error).message.slice(0, 200)}`, action: intent.intent });
  }
});

module.exports = router;
