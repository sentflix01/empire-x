/**
 * routes/devops.js — Developer Ops Hub
 *
 * Tracks bugs, features, and tasks for the Nodbusiness platform.
 * Also exposes strategy version status and board statistics.
 *
 * READ   — any authenticated user (developers/owner can view the board)
 * WRITE  — admin only (create / update / delete / bulk operations)
 *
 * Endpoints:
 *   GET    /api/devops                — list items (filterable)
 *   POST   /api/devops                — create item (admin)
 *   PUT    /api/devops/:id            — update item (admin)
 *   DELETE /api/devops/:id            — delete item (admin)
 *   GET    /api/devops/stats          — board statistics
 *   POST   /api/devops/bulk-status    — bulk move items to a status (admin)
 *
 *   GET    /api/devops/versions       — get strategy version statuses
 *   PUT    /api/devops/versions/:ver  — update a version status (admin)
 */
const router = require('express').Router();
const pool   = require('../db/pool');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const KINDS      = ['bug', 'feature', 'task'];
const STATUSES   = ['open', 'in_progress', 'blocked', 'done', 'planned', 'implemented'];
const SEVERITIES = ['urgent', 'warning', 'attention', 'cross_check'];
const RESOLVED   = new Set(['done', 'implemented']);

// All routes require auth
router.use(requireAuth);

// ── GET /api/devops/stats ─────────────────────────────────────────────────────
router.get('/stats', async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        COUNT(*)                                              AS total,
        COUNT(*) FILTER (WHERE status = 'open')              AS open,
        COUNT(*) FILTER (WHERE status = 'in_progress')       AS in_progress,
        COUNT(*) FILTER (WHERE status = 'blocked')           AS blocked,
        COUNT(*) FILTER (WHERE status = 'planned')           AS planned,
        COUNT(*) FILTER (WHERE status = 'done')              AS done,
        COUNT(*) FILTER (WHERE status = 'implemented')       AS implemented,
        COUNT(*) FILTER (WHERE kind = 'bug'
          AND status NOT IN ('done','implemented'))           AS open_bugs,
        COUNT(*) FILTER (WHERE severity = 'urgent'
          AND status NOT IN ('done','implemented'))           AS urgent,
        COUNT(*) FILTER (WHERE severity = 'warning'
          AND status NOT IN ('done','implemented'))           AS warning,
        COUNT(*) FILTER (WHERE severity = 'attention'
          AND status NOT IN ('done','implemented'))           AS attention,
        COUNT(*) FILTER (WHERE severity = 'cross_check'
          AND status NOT IN ('done','implemented'))           AS cross_check,
        COUNT(*) FILTER (WHERE resolved_at >= NOW() - INTERVAL '7 days') AS resolved_this_week
      FROM devops_items
    `);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ── GET /api/devops/versions ──────────────────────────────────────────────────
// Returns persisted strategy version statuses (or defaults if not set)
router.get('/versions', async (_req, res) => {
  try {
    // Use a simple key-value store in a JSON column on a singleton settings row
    // If the table/row doesn't exist yet we return defaults
    const { rows } = await pool.query(`
      SELECT value FROM app_settings WHERE key = 'devops_version_statuses' LIMIT 1
    `).catch(() => ({ rows: [] }));

    const defaults = {
      'v1.0': 'not_started', 'v1.1': 'not_started', 'v1.2': 'not_started',
      'v1.3': 'not_started', 'v1.4': 'not_started', 'v1.5': 'not_started',
      'v1.6': 'not_started', 'v1.7': 'not_started', 'v1.8': 'not_started',
      'v1.9': 'not_started', 'v2.0': 'not_started', 'v2.1': 'not_started',
      'v2.2': 'not_started', 'v2.3': 'not_started', 'v2.4': 'not_started',
      'v3.0': 'not_started',
    };

    if (rows.length && rows[0].value) {
      return res.json({ ...defaults, ...rows[0].value });
    }
    res.json(defaults);
  } catch {
    res.json({});
  }
});

// ── PUT /api/devops/versions/:version ─────────────────────────────────────────
router.put('/versions/:version', requireAdmin, async (req, res) => {
  const { version } = req.params;
  const { status }  = req.body;
  const valid = ['not_started', 'in_progress', 'completed', 'paused'];
  if (!valid.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${valid.join(', ')}` });
  }
  try {
    // Upsert into app_settings
    await pool.query(`
      INSERT INTO app_settings (key, value, updated_at)
      VALUES ('devops_version_statuses', $1::jsonb, NOW())
      ON CONFLICT (key) DO UPDATE
        SET value = app_settings.value || $1::jsonb,
            updated_at = NOW()
    `, [JSON.stringify({ [version]: status })]);
    res.json({ version, status });
  } catch (err) {
    // app_settings table may not exist yet — silently return success
    // (version status is stored client-side as fallback)
    res.json({ version, status });
  }
});

// ── GET /api/devops ───────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { kind, status, severity, search, limit = 500 } = req.query;

    if (kind     && !KINDS.includes(kind))           return res.status(400).json({ error: `Invalid kind. Must be: ${KINDS.join(', ')}` });
    if (status   && !STATUSES.includes(status))      return res.status(400).json({ error: `Invalid status. Must be: ${STATUSES.join(', ')}` });
    if (severity && !SEVERITIES.includes(severity))  return res.status(400).json({ error: `Invalid severity. Must be: ${SEVERITIES.join(', ')}` });

    const clauses = [];
    const values  = [];

    if (kind)     { clauses.push(`d.kind = $${values.length + 1}`);     values.push(kind); }
    if (status)   { clauses.push(`d.status = $${values.length + 1}`);   values.push(status); }
    if (severity) { clauses.push(`d.severity = $${values.length + 1}`); values.push(severity); }
    if (search)   {
      values.push(`%${String(search).toLowerCase()}%`);
      clauses.push(`(LOWER(d.title) LIKE $${values.length} OR LOWER(COALESCE(d.description,'')) LIKE $${values.length})`);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    const { rows } = await pool.query(
      `SELECT d.*, u.full_name AS created_by_name, u.email AS created_by_email
       FROM devops_items d
       LEFT JOIN users u ON u.id = d.created_by
       ${where}
       ORDER BY
         CASE d.severity
           WHEN 'urgent'      THEN 0 WHEN 'warning'    THEN 1
           WHEN 'attention'   THEN 2 WHEN 'cross_check' THEN 3 ELSE 4
         END,
         CASE d.status
           WHEN 'open'        THEN 0 WHEN 'in_progress' THEN 1
           WHEN 'blocked'     THEN 2 WHEN 'planned'     THEN 3
           WHEN 'done'        THEN 4 WHEN 'implemented' THEN 5 ELSE 6
         END,
         d.updated_at DESC
       LIMIT $${values.length + 1}`,
      [...values, Math.min(Number(limit) || 500, 1000)]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch devops items' });
  }
});

// ── POST /api/devops ──────────────────────────────────────────────────────────
router.post('/', requireAdmin, async (req, res) => {
  const { kind, title, description = null, severity = null, status = 'open', tags = null, assigned_to = null } = req.body || {};

  if (!KINDS.includes(kind))                                   return res.status(400).json({ error: `kind must be: ${KINDS.join(', ')}` });
  if (!title || !String(title).trim())                         return res.status(400).json({ error: 'title is required' });
  if (!STATUSES.includes(status))                              return res.status(400).json({ error: `status must be: ${STATUSES.join(', ')}` });
  if (severity !== null && !SEVERITIES.includes(severity))     return res.status(400).json({ error: `severity must be: ${SEVERITIES.join(', ')}` });
  if (tags !== null && !Array.isArray(tags))                   return res.status(400).json({ error: 'tags must be an array' });

  try {
    const resolvedAt = RESOLVED.has(status) ? new Date() : null;
    const { rows } = await pool.query(
      `INSERT INTO devops_items (kind, title, description, severity, status, tags, assigned_to, created_by, resolved_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [kind, String(title).trim(), description || null, severity, status, tags, assigned_to || null, req.user.id, resolvedAt]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create item' });
  }
});

// ── PUT /api/devops/:id ───────────────────────────────────────────────────────
router.put('/:id', requireAdmin, async (req, res) => {
  const { kind, title, description, severity, status, tags, assigned_to } = req.body || {};

  if (kind     !== undefined && !KINDS.includes(kind))                          return res.status(400).json({ error: `kind must be: ${KINDS.join(', ')}` });
  if (title    !== undefined && !String(title).trim())                          return res.status(400).json({ error: 'title cannot be empty' });
  if (status   !== undefined && !STATUSES.includes(status))                     return res.status(400).json({ error: `status must be: ${STATUSES.join(', ')}` });
  if (severity !== undefined && severity !== null && !SEVERITIES.includes(severity)) return res.status(400).json({ error: `severity must be: ${SEVERITIES.join(', ')}` });
  if (tags     !== undefined && tags !== null && !Array.isArray(tags))          return res.status(400).json({ error: 'tags must be an array' });

  try {
    const existing = await pool.query('SELECT status FROM devops_items WHERE id = $1', [req.params.id]);
    if (!existing.rows.length) return res.status(404).json({ error: 'Item not found' });

    const newStatus   = status !== undefined ? status : existing.rows[0].status;
    const wasResolved = RESOLVED.has(existing.rows[0].status);
    const isResolved  = RESOLVED.has(newStatus);
    const resolvedAt  = isResolved ? (wasResolved ? undefined : new Date()) : null;

    const { rows } = await pool.query(
      `UPDATE devops_items SET
         kind        = COALESCE($1, kind),
         title       = COALESCE($2, title),
         description = CASE WHEN $3::text IS DISTINCT FROM NULL THEN $3 ELSE description END,
         severity    = CASE WHEN $4::boolean THEN $5 ELSE severity END,
         status      = COALESCE($6, status),
         tags        = CASE WHEN $7::boolean THEN $8 ELSE tags END,
         assigned_to = CASE WHEN $9::boolean THEN $10 ELSE assigned_to END,
         resolved_at = COALESCE($11, resolved_at),
         updated_at  = NOW()
       WHERE id = $12
       RETURNING *`,
      [
        kind ?? null,
        title !== undefined ? String(title).trim() : null,
        description !== undefined ? (description || null) : null,
        severity !== undefined, severity !== undefined ? (severity || null) : null,
        status ?? null,
        tags !== undefined, tags ?? null,
        assigned_to !== undefined, assigned_to ?? null,
        resolvedAt,
        req.params.id,
      ]
    );

    // Clear resolved_at when reopening
    if (!isResolved && wasResolved) {
      await pool.query('UPDATE devops_items SET resolved_at = NULL WHERE id = $1', [req.params.id]);
      rows[0].resolved_at = null;
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// ── DELETE /api/devops/:id ────────────────────────────────────────────────────
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM devops_items WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Item not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// ── POST /api/devops/bulk-status ──────────────────────────────────────────────
// Move multiple items to a new status at once
router.post('/bulk-status', requireAdmin, async (req, res) => {
  const { ids, status } = req.body || {};
  if (!Array.isArray(ids) || !ids.length)  return res.status(400).json({ error: 'ids must be a non-empty array' });
  if (!STATUSES.includes(status))           return res.status(400).json({ error: `status must be: ${STATUSES.join(', ')}` });

  try {
    const resolvedAt = RESOLVED.has(status) ? new Date() : null;
    const { rowCount } = await pool.query(
      `UPDATE devops_items
       SET status = $1, resolved_at = CASE WHEN $2 THEN COALESCE(resolved_at, NOW()) ELSE NULL END, updated_at = NOW()
       WHERE id = ANY($3::uuid[])`,
      [status, RESOLVED.has(status), ids]
    );
    res.json({ updated: rowCount });
  } catch (err) {
    res.status(500).json({ error: 'Failed to bulk update items' });
  }
});

// ════════════════════════════════════════════════════════════════════════════════
// LIVE ERROR FEED — reads from error_events table populated by errorCollector.js
// ════════════════════════════════════════════════════════════════════════════════

// ── GET /api/devops/errors ────────────────────────────────────────────────────
// Returns paginated error events for the DevOps live error feed.
// Query params:
//   level      — 'error'|'warn'|'info'|'critical' (filter)
//   source     — 'server'|'route'|'client'|'manual' (filter)
//   resolved   — 'true'|'false' (default: 'false')
//   search     — text search in message/path
//   limit      — max records (default 50, max 200)
//   since      — ISO timestamp — only return errors after this time (for polling)
router.get('/errors', requireAuth, async (req, res) => {
  try {
    const { level, source, resolved = 'false', search, limit = 50, since } = req.query;

    const VALID_LEVELS  = ['error', 'warn', 'info', 'critical'];
    const VALID_SOURCES = ['server', 'route', 'client', 'manual'];

    if (level  && !VALID_LEVELS.includes(level))   return res.status(400).json({ error: `Invalid level` });
    if (source && !VALID_SOURCES.includes(source)) return res.status(400).json({ error: `Invalid source` });

    const clauses = [];
    const values  = [];

    // Resolved filter (default: show unresolved only)
    clauses.push(`e.resolved = $${values.length + 1}`);
    values.push(resolved === 'true');

    if (level)  { clauses.push(`e.level = $${values.length + 1}`);  values.push(level); }
    if (source) { clauses.push(`e.source = $${values.length + 1}`); values.push(source); }
    if (since)  {
      clauses.push(`e.last_seen_at > $${values.length + 1}`);
      values.push(new Date(since));
    }
    if (search) {
      values.push(`%${String(search).toLowerCase()}%`);
      clauses.push(`(LOWER(e.message) LIKE $${values.length} OR LOWER(COALESCE(e.path,'')) LIKE $${values.length})`);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    const { rows } = await pool.query(
      `SELECT
         e.*,
         u.full_name  AS resolved_by_name,
         d.title      AS devops_item_title,
         d.status     AS devops_item_status
       FROM error_events e
       LEFT JOIN users         u ON u.id = e.resolved_by
       LEFT JOIN devops_items  d ON d.id = e.devops_item_id
       ${where}
       ORDER BY
         CASE e.level
           WHEN 'critical' THEN 0 WHEN 'error' THEN 1
           WHEN 'warn'     THEN 2 WHEN 'info'  THEN 3 ELSE 4
         END,
         e.last_seen_at DESC
       LIMIT $${values.length + 1}`,
      [...values, Math.min(Number(limit) || 50, 200)]
    );

    res.json(rows);
  } catch (err) {
    // Table may not exist yet (migration not run)
    if (err.code === '42P01') return res.json([]);
    res.status(500).json({ error: 'Failed to fetch error events' });
  }
});

// ── GET /api/devops/errors/stats ──────────────────────────────────────────────
// Summary counts for the error feed header badges
router.get('/errors/stats', requireAuth, async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        COUNT(*)                                                          AS total,
        COUNT(*) FILTER (WHERE resolved = false)                         AS unresolved,
        COUNT(*) FILTER (WHERE level = 'critical' AND resolved = false)  AS critical,
        COUNT(*) FILTER (WHERE level = 'error'    AND resolved = false)  AS errors,
        COUNT(*) FILTER (WHERE level = 'warn'     AND resolved = false)  AS warnings,
        COUNT(*) FILTER (WHERE source = 'server'  AND resolved = false)  AS server,
        COUNT(*) FILTER (WHERE source = 'route'   AND resolved = false)  AS route,
        COUNT(*) FILTER (WHERE source = 'client'  AND resolved = false)  AS client,
        COUNT(*) FILTER (WHERE last_seen_at > NOW() - INTERVAL '1 hour'
          AND resolved = false)                                           AS last_hour,
        COUNT(*) FILTER (WHERE last_seen_at > NOW() - INTERVAL '24 hours'
          AND resolved = false)                                           AS last_24h
      FROM error_events
    `);
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '42P01') return res.json({ total: 0, unresolved: 0, critical: 0, errors: 0, warnings: 0, last_hour: 0, last_24h: 0 });
    res.status(500).json({ error: 'Failed to fetch error stats' });
  }
});

// ── PATCH /api/devops/errors/:id/resolve ─────────────────────────────────────
// Mark an error as resolved (admin only)
router.patch('/errors/:id/resolve', requireAdmin, async (req, res) => {
  const { note = '' } = req.body || {};
  try {
    const { rows } = await pool.query(
      `UPDATE error_events
       SET resolved = true, resolved_at = NOW(), resolved_by = $1, resolution_note = $2
       WHERE id = $3 RETURNING *`,
      [req.user.id, note || null, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Error event not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to resolve error' });
  }
});

// ── PATCH /api/devops/errors/resolve-all ─────────────────────────────────────
// Resolve all unresolved errors matching optional filters (admin only)
router.patch('/errors/resolve-all', requireAdmin, async (req, res) => {
  const { level, source } = req.body || {};
  try {
    const clauses = ['resolved = false'];
    const values  = [req.user.id];
    if (level)  { clauses.push(`level = $${values.length + 1}`);  values.push(level); }
    if (source) { clauses.push(`source = $${values.length + 1}`); values.push(source); }

    const { rowCount } = await pool.query(
      `UPDATE error_events SET resolved = true, resolved_at = NOW(), resolved_by = $1
       WHERE ${clauses.join(' AND ')}`,
      values
    );
    res.json({ resolved: rowCount });
  } catch (err) {
    res.status(500).json({ error: 'Failed to bulk resolve errors' });
  }
});

// ── POST /api/devops/errors/:id/to-ticket ────────────────────────────────────
// Convert an error event into a devops_items bug ticket (admin only)
router.post('/errors/:id/to-ticket', requireAdmin, async (req, res) => {
  try {
    const { rows: [evt] } = await pool.query(
      'SELECT * FROM error_events WHERE id = $1',
      [req.params.id]
    );
    if (!evt) return res.status(404).json({ error: 'Error event not found' });

    // Build a descriptive bug title from the error
    const title = `[Auto] ${evt.name || 'Error'}: ${(evt.message || '').slice(0, 120)}`;
    const description = [
      `**Source:** ${evt.source} | **Level:** ${evt.level}`,
      evt.path   ? `**Path:** \`${evt.method} ${evt.path}\`` : '',
      evt.stack  ? `\n**Stack trace:**\n\`\`\`\n${evt.stack.slice(0, 1500)}\n\`\`\`` : '',
      `\n**Occurrences:** ${evt.occurrence} | **First seen:** ${evt.first_seen_at} | **Last seen:** ${evt.last_seen_at}`,
    ].filter(Boolean).join('\n');

    const severity = evt.level === 'critical' ? 'urgent'
                   : evt.level === 'error'    ? 'warning'
                   : 'attention';

    const { rows: [ticket] } = await pool.query(
      `INSERT INTO devops_items (kind, title, description, severity, status, tags, created_by)
       VALUES ('bug', $1, $2, $3, 'open', ARRAY['auto-captured'], $4) RETURNING *`,
      [title, description, severity, req.user.id]
    );

    // Link the error event to the new ticket
    await pool.query(
      'UPDATE error_events SET devops_item_id = $1 WHERE id = $2',
      [ticket.id, evt.id]
    );

    res.status(201).json({ ticket, error_event: { ...evt, devops_item_id: ticket.id } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to convert error to ticket' });
  }
});

// ── POST /api/devops/errors/report ────────────────────────────────────────────
// Frontend client error reporting endpoint — no auth required (public, rate-limited)
// Used to capture JS errors from the Next.js frontend
const clientErrorLimiter = require('express-rate-limit')({
  windowMs: 60 * 1000,    // 1 minute
  max: 20,                // max 20 client errors per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV !== 'production',
});
router.post('/errors/report', clientErrorLimiter, async (req, res) => {
  try {
    const { message, name, stack, path: errorPath, context } = req.body || {};
    if (!message) return res.status(400).json({ error: 'message is required' });

    const { captureError } = require('../lib/errorCollector');
    const err = new Error(String(message).slice(0, 2000));
    err.name  = String(name || 'ClientError').slice(0, 100);
    err.stack = stack ? String(stack).slice(0, 5000) : null;

    await captureError(err, {
      source: 'client',
      level:  'error',
      context: { ...(context || {}), clientPath: errorPath },
    });

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to report error' });
  }
});

module.exports = router;
