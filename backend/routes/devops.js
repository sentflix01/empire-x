/**
 * routes/devops.js — Developer Ops / Todo Board
 *
 * Tracks bugs, features, and tasks for admins/developers/owner.
 *
 * READ  — any authenticated user (developers may view the board).
 * WRITE — admin only (create / update / delete).
 */
const router = require('express').Router();
const pool = require('../db/pool');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const KINDS = ['bug', 'feature', 'task'];
const STATUSES = ['open', 'in_progress', 'blocked', 'done', 'planned', 'implemented'];
const SEVERITIES = ['urgent', 'warning', 'attention', 'cross_check'];
const RESOLVED_STATUSES = ['done', 'implemented'];

// All devops routes require authentication
router.use(requireAuth);

// ── List — filterable by kind / status / severity ───────────────────────────
router.get('/', async (req, res) => {
  try {
    const { kind, status, severity } = req.query;
    if (kind && !KINDS.includes(kind)) return res.status(400).json({ error: `Invalid kind. Must be one of: ${KINDS.join(', ')}` });
    if (status && !STATUSES.includes(status)) return res.status(400).json({ error: `Invalid status. Must be one of: ${STATUSES.join(', ')}` });
    if (severity && !SEVERITIES.includes(severity)) return res.status(400).json({ error: `Invalid severity. Must be one of: ${SEVERITIES.join(', ')}` });

    const clauses = [];
    const values = [];
    if (kind)     { clauses.push(`kind = $${values.length + 1}`);     values.push(kind); }
    if (status)   { clauses.push(`status = $${values.length + 1}`);   values.push(status); }
    if (severity) { clauses.push(`severity = $${values.length + 1}`); values.push(severity); }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    const { rows } = await pool.query(
      `SELECT d.*, u.full_name AS created_by_name, u.email AS created_by_email
       FROM devops_items d
       LEFT JOIN users u ON u.id = d.created_by
       ${where}
       ORDER BY
         CASE d.severity
           WHEN 'urgent' THEN 0 WHEN 'warning' THEN 1
           WHEN 'attention' THEN 2 WHEN 'cross_check' THEN 3 ELSE 4
         END,
         d.updated_at DESC`,
      values
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch devops items' });
  }
});

// ── Create (admin only) ──────────────────────────────────────────────────────
router.post('/', requireAdmin, async (req, res) => {
  const { kind, title, description = null, severity = null, status = 'open', tags = null, assigned_to = null } = req.body || {};
  if (!KINDS.includes(kind)) return res.status(400).json({ error: `Invalid kind. Must be one of: ${KINDS.join(', ')}` });
  if (!title || !String(title).trim()) return res.status(400).json({ error: 'Title is required' });
  if (!STATUSES.includes(status)) return res.status(400).json({ error: `Invalid status. Must be one of: ${STATUSES.join(', ')}` });
  if (severity !== null && !SEVERITIES.includes(severity)) return res.status(400).json({ error: `Invalid severity. Must be one of: ${SEVERITIES.join(', ')}` });
  if (tags !== null && !Array.isArray(tags)) return res.status(400).json({ error: 'tags must be an array of strings' });

  try {
    const resolvedAt = RESOLVED_STATUSES.includes(status) ? new Date() : null;
    const { rows } = await pool.query(
      `INSERT INTO devops_items (kind, title, description, severity, status, tags, assigned_to, created_by, resolved_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [kind, String(title).trim(), description || null, severity, status, tags, assigned_to || null, req.user.id, resolvedAt]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create devops item' });
  }
});

// ── Update (admin only) ──────────────────────────────────────────────────────
router.put('/:id', requireAdmin, async (req, res) => {
  const { kind, title, description, severity, status, tags, assigned_to } = req.body || {};
  if (kind !== undefined && !KINDS.includes(kind)) return res.status(400).json({ error: `Invalid kind. Must be one of: ${KINDS.join(', ')}` });
  if (title !== undefined && !String(title).trim()) return res.status(400).json({ error: 'Title cannot be empty' });
  if (status !== undefined && !STATUSES.includes(status)) return res.status(400).json({ error: `Invalid status. Must be one of: ${STATUSES.join(', ')}` });
  if (severity !== undefined && severity !== null && !SEVERITIES.includes(severity)) return res.status(400).json({ error: `Invalid severity. Must be one of: ${SEVERITIES.join(', ')}` });
  if (tags !== undefined && tags !== null && !Array.isArray(tags)) return res.status(400).json({ error: 'tags must be an array of strings' });

  try {
    const existing = await pool.query('SELECT status FROM devops_items WHERE id = $1', [req.params.id]);
    if (!existing.rows.length) return res.status(404).json({ error: 'Devops item not found' });

    const newStatus = status !== undefined ? status : existing.rows[0].status;
    const wasResolved = RESOLVED_STATUSES.includes(existing.rows[0].status);
    const isResolved = RESOLVED_STATUSES.includes(newStatus);

    // Set resolved_at when becoming done/implemented; clear when reopened.
    let resolvedAt;
    if (isResolved) resolvedAt = wasResolved ? undefined : new Date(); // keep original timestamp if already resolved
    else resolvedAt = null;

    const { rows } = await pool.query(
      `UPDATE devops_items SET
         kind = COALESCE($1, kind),
         title = COALESCE($2, title),
         description = CASE WHEN $3::text IS DISTINCT FROM NULL THEN $3 ELSE description END,
         severity = CASE WHEN $4::boolean THEN $5 ELSE severity END,
         status = COALESCE($6, status),
         tags = CASE WHEN $7::boolean THEN $8 ELSE tags END,
         assigned_to = CASE WHEN $9::boolean THEN $10 ELSE assigned_to END,
         resolved_at = COALESCE($11, resolved_at),
         updated_at = NOW()
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
    // Handle "clear resolved_at on reopen" (COALESCE above can't null it out)
    if (!isResolved && wasResolved) {
      await pool.query('UPDATE devops_items SET resolved_at = NULL WHERE id = $1', [req.params.id]);
      rows[0].resolved_at = null;
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update devops item' });
  }
});

// ── Delete (admin only) ──────────────────────────────────────────────────────
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM devops_items WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Devops item not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete devops item' });
  }
});

module.exports = router;
