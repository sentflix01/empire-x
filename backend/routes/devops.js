/**
 * routes/devops.js — Developer Ops Hub
 *
 * Tracks bugs, features, and tasks for the Halehame platform.
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

module.exports = router;
