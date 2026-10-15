import { Router } from 'express';
import type { Request, Response } from 'express';
import pool from '../db/pool';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

function isHttpUrl(v: unknown): v is string {
  if (typeof v !== 'string' || !v.trim()) return false;
  try { const u = new URL(v); return u.protocol === 'https:' || u.protocol === 'http:'; } catch { return false; }
}

router.post('/request', requireAuth, async (req: Request, res: Response) => {
  const { verification_type = 'personal', supporting_docs, reason, selfie_url, id_document_url } = req.body as Record<string, string>;
  const validTypes = ['personal', 'business', 'creator', 'official'];
  if (!validTypes.includes(verification_type)) {
    res.status(400).json({ error: `Invalid verification_type. Must be: ${validTypes.join(', ')}` }); return;
  }
  // verification_requests.selfie_url and id_document_url are NOT NULL (migrate13).
  if (!isHttpUrl(selfie_url) || !isHttpUrl(id_document_url)) {
    res.status(400).json({ error: 'selfie_url and id_document_url must be valid URLs' }); return;
  }
  try {
    const { rows: existing } = await pool.query(
      'SELECT id,status FROM verification_requests WHERE user_id=$1 ORDER BY created_at DESC',
      [req.user!.id],
    );
    if (existing.some((r) => r.status === 'pending')) { res.status(409).json({ error: 'You already have a pending verification request' }); return; }
    const params = [req.user!.id, verification_type, selfie_url, id_document_url, supporting_docs ?? null, reason ?? null];
    // migrate13 declares UNIQUE(user_id): a user whose earlier request was
    // resolved re-opens that row instead of inserting a second one.
    const { rows } = existing.length
      ? await pool.query(
        `UPDATE verification_requests
            SET verification_type=$2, selfie_url=$3, id_document_url=$4, supporting_docs=$5, reason=$6,
                status='pending', admin_note=NULL, reviewed_by=NULL, reviewed_at=NULL, resolved_at=NULL,
                created_at=NOW(), updated_at=NOW()
          WHERE id=$7 AND user_id=$1 RETURNING *`,
        [...params, existing[0].id],
      )
      : await pool.query(
        `INSERT INTO verification_requests (user_id,verification_type,selfie_url,id_document_url,supporting_docs,reason)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        params,
      );
    res.status(201).json(rows[0]);
  } catch { res.status(500).json({ error: 'Failed to submit verification request' }); }
});

// Shape consumed by frontend-next/components/profile/VerificationRequest.tsx.
router.get('/status', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rows: profile } = await pool.query(
      'SELECT is_verified, verification_type, verified_at FROM user_profiles WHERE user_id=$1',
      [req.user!.id],
    );
    const { rows: request } = await pool.query(
      `SELECT id, status, verification_type, admin_note, created_at, COALESCE(resolved_at, reviewed_at) AS reviewed_at
         FROM verification_requests WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1`,
      [req.user!.id],
    );
    res.json({
      is_verified: Boolean(profile[0]?.is_verified),
      verification_type: profile[0]?.verification_type ?? null,
      verified_at: profile[0]?.verified_at ?? null,
      request: request[0] ?? null,
    });
  } catch { res.status(500).json({ error: 'Failed to fetch verification status' }); }
});

router.get('/my-request', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM verification_requests WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1`,
      [req.user!.id],
    );
    res.json(rows[0] ?? null);
  } catch { res.status(500).json({ error: 'Failed to fetch verification request' }); }
});

router.get('/', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { status = 'pending', limit = '50', offset = '0' } = req.query as Record<string, string>;
    const { rows } = await pool.query(
      `SELECT vr.*,u.email,up.display_name,up.avatar_url FROM verification_requests vr
       JOIN users u ON u.id=vr.user_id LEFT JOIN user_profiles up ON up.user_id=vr.user_id
       WHERE vr.status=$1 ORDER BY vr.created_at DESC LIMIT $2 OFFSET $3`,
      [status, parseInt(limit), parseInt(offset)],
    );
    res.json(rows);
  } catch { res.status(500).json({ error: 'Failed to fetch requests' }); }
});

router.put('/:id/approve', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const { note } = req.body as { note?: string };
  try {
    const { rows } = await pool.query(
      `UPDATE verification_requests SET status='approved',admin_note=$1,resolved_at=NOW() WHERE id=$2 RETURNING user_id,verification_type`,
      [note ?? null, req.params.id],
    );
    if (!rows.length) { res.status(404).json({ error: 'Request not found' }); return; }
    const { user_id, verification_type } = rows[0] as { user_id: string; verification_type: string };
    await pool.query(`UPDATE user_profiles SET is_verified=TRUE,verification_type=$1,verified_at=NOW() WHERE user_id=$2`, [verification_type, user_id]);
    await pool.query('UPDATE users SET is_verified=TRUE WHERE id=$1', [user_id]);
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Failed to approve request' }); }
});

router.put('/:id/reject', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const { note } = req.body as { note?: string };
  try {
    const { rows } = await pool.query(
      `UPDATE verification_requests SET status='rejected',admin_note=$1,resolved_at=NOW() WHERE id=$2 RETURNING id`,
      [note ?? null, req.params.id],
    );
    if (!rows.length) { res.status(404).json({ error: 'Request not found' }); return; }
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Failed to reject request' }); }
});

module.exports = router;
