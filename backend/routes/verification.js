/**
 * routes/verification.js — Profile verification request flow
 *
 * Users submit a selfie + ID document for admin review.
 * Admins approve/reject from the admin panel.
 *
 * POST   /api/verification/request        — submit verification request
 * GET    /api/verification/status         — get current user's request status
 * GET    /api/verification/requests       — admin: list pending requests
 * PUT    /api/verification/requests/:id   — admin: approve or reject
 */

const router = require('express').Router();
const pool = require('../db/pool');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { emitNotification } = require('../socket');
const logger = require('../lib/logger');

// ── POST /api/verification/request ───────────────────────────────────────────
// User submits selfie + ID document URLs for verification
router.post('/request', requireAuth, async (req, res) => {
  const { selfie_url, id_document_url, full_name, verification_type = 'personal' } = req.body;

  if (!selfie_url || !id_document_url) {
    return res.status(400).json({ error: 'selfie_url and id_document_url are required' });
  }

  const validTypes = ['personal', 'business', 'creator', 'official'];
  if (!validTypes.includes(verification_type)) {
    return res.status(400).json({ error: 'Invalid verification_type' });
  }

  try {
    // Upsert — replace any existing pending request
    const { rows } = await pool.query(
      `INSERT INTO verification_requests
         (user_id, selfie_url, id_document_url, full_name, verification_type, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
       ON CONFLICT (user_id) DO UPDATE
         SET selfie_url = EXCLUDED.selfie_url,
             id_document_url = EXCLUDED.id_document_url,
             full_name = EXCLUDED.full_name,
             verification_type = EXCLUDED.verification_type,
             status = 'pending',
             admin_note = NULL,
             reviewed_by = NULL,
             reviewed_at = NULL,
             updated_at = NOW()
       RETURNING id, status, created_at`,
      [req.user.id, selfie_url, id_document_url, full_name || null, verification_type]
    );

    logger.info({ userId: req.user.id, requestId: rows[0].id }, 'Verification request submitted');
    res.status(201).json({ success: true, request: rows[0] });
  } catch (err) {
    logger.error({ err: err.message }, 'Failed to submit verification request');
    res.status(500).json({ error: 'Failed to submit verification request' });
  }
});

// ── GET /api/verification/status ──────────────────────────────────────────────
// Returns the current user's verification request status
router.get('/status', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT vr.id, vr.status, vr.verification_type, vr.admin_note,
              vr.created_at, vr.reviewed_at,
              up.is_verified, up.verification_type AS granted_type, up.verified_at
       FROM verification_requests vr
       RIGHT JOIN user_profiles up ON up.user_id = $1
       WHERE vr.user_id = $1 OR vr.user_id IS NULL
       ORDER BY vr.created_at DESC LIMIT 1`,
      [req.user.id]
    );

    // Simpler direct query
    const [reqRow] = await pool.query(
      'SELECT id, status, verification_type, admin_note, created_at, reviewed_at FROM verification_requests WHERE user_id = $1',
      [req.user.id]
    ).then(r => [r.rows[0]]);

    const [profileRow] = await pool.query(
      'SELECT is_verified, verification_type, verified_at FROM user_profiles WHERE user_id = $1',
      [req.user.id]
    ).then(r => [r.rows[0]]);

    res.json({
      is_verified: profileRow?.is_verified || false,
      verification_type: profileRow?.verification_type || null,
      verified_at: profileRow?.verified_at || null,
      request: reqRow || null,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch verification status' });
  }
});

// ── GET /api/verification/requests (admin) ────────────────────────────────────
// List all verification requests, filtered by status
router.get('/requests', requireAuth, requireAdmin, async (req, res) => {
  const { status = 'pending', limit = 50, offset = 0 } = req.query;
  try {
    const conditions = [];
    const values = [parseInt(limit), parseInt(offset)];

    if (status !== 'all') {
      values.push(status);
      conditions.push(`vr.status = $${values.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await pool.query(
      `SELECT vr.*,
              u.email, u.full_name as account_name,
              up.display_name, up.avatar_url, up.is_verified,
              up.follower_count
       FROM verification_requests vr
       JOIN users u ON u.id = vr.user_id
       LEFT JOIN user_profiles up ON up.user_id = vr.user_id
       ${where}
       ORDER BY vr.created_at ASC
       LIMIT $1 OFFSET $2`,
      values
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch verification requests' });
  }
});

// ── PUT /api/verification/requests/:id (admin) ────────────────────────────────
// Approve or reject a verification request
router.put('/requests/:id', requireAuth, requireAdmin, async (req, res) => {
  const { action, admin_note = '' } = req.body; // action: 'approve' | 'reject'

  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'action must be "approve" or "reject"' });
  }

  try {
    // Fetch request
    const { rows: reqRows } = await pool.query(
      'SELECT * FROM verification_requests WHERE id = $1',
      [req.params.id]
    );
    if (!reqRows.length) return res.status(404).json({ error: 'Request not found' });
    const request = reqRows[0];

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    // Update request
    await pool.query(
      `UPDATE verification_requests
       SET status = $1, admin_note = $2, reviewed_by = $3, reviewed_at = NOW(), updated_at = NOW()
       WHERE id = $4`,
      [newStatus, admin_note || null, req.user.id, req.params.id]
    );

    if (action === 'approve') {
      // Grant verification badge
      await pool.query(
        `UPDATE user_profiles
         SET is_verified = TRUE,
             verification_type = $1,
             verified_at = NOW(),
             verification_note = $2
         WHERE user_id = $3`,
        [request.verification_type, admin_note || null, request.user_id]
      );
      await pool.query('UPDATE users SET is_verified = TRUE WHERE id = $1', [request.user_id]);
    } else {
      // Revoke if previously verified (in case of re-review)
      // Don't revoke if they had a prior verification — only reject the new request
    }

    // Notify the user
    const notifTitle = action === 'approve'
      ? '🎉 Your account has been verified!'
      : 'Your verification request was reviewed';
    const notifBody = action === 'approve'
      ? 'You now have a verified badge on your profile.'
      : `Your request was not approved. ${admin_note ? 'Reason: ' + admin_note : 'Please resubmit with clearer photos.'}`;

    const { rows: [notif] } = await pool.query(
      `INSERT INTO notifications (user_id, type, title, body, link, is_read)
       VALUES ($1, 'system', $2, $3, '/profile', false) RETURNING *`,
      [request.user_id, notifTitle, notifBody]
    );
    emitNotification(request.user_id, notif);

    res.json({ success: true, status: newStatus });
  } catch (err) {
    logger.error({ err: err.message }, 'Failed to review verification request');
    res.status(500).json({ error: 'Failed to review verification request' });
  }
});

module.exports = router;
