import { Router } from 'express';
import type { Request, Response } from 'express';
import pool from '../db/pool';
import { requireAuth, requireAdmin, optionalAuth } from '../middleware/auth';
import { captureError } from '../lib/errorCollector';

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

module.exports = router;
