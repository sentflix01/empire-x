import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import pool from '../db/pool';
import logger from '../lib/logger';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { personProfileJoin } from '../lib/personProfile';
import { fileFilter, validateFileBytes } from '../middleware/upload';
import {
  DEFAULT_LINK_SECONDS, PRIVATE_FILE_MIME_TYPES, isPrivateRef, privateFileLink, storePrivateFile,
} from '../lib/privateFiles';
import { deleteStoredFiles } from '../lib/storedFiles';

/**
 * Identity verification (audit F-013).
 *
 * Selfies and identity documents are stored privately (lib/privateFiles.ts).
 * The verification_requests.selfie_url and id_document_url columns hold a
 * private reference ("private:verification/<user>/<file>"), never a public URL.
 * Only the owner and admins can get a short-lived link to view them
 * (owner decision 2026-11-06: admins only; kept until the account is deleted).
 * Older rows may still hold public URLs until
 * scripts/migrate-verification-documents.ts moves them.
 */
const router = Router();

const MAX_DOCUMENT_MB = 10;
const privateUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (!PRIVATE_FILE_MIME_TYPES.includes(file.mimetype)) {
      cb(Object.assign(new Error('Upload a photo (JPEG, PNG, WebP, HEIC) or a PDF.'), { code: 'UNSUPPORTED_FILE_TYPE', statusCode: 415 }));
      return;
    }
    // Same extension/type agreement rules as every other upload.
    fileFilter!(req, file, cb);
  },
  limits: { fileSize: MAX_DOCUMENT_MB * 1024 * 1024, files: 1 },
});

function acceptDocument(req: Request, res: Response, next: NextFunction): void {
  privateUpload.single('file')(req, res, (err?: unknown) => {
    if (!err) { next(); return; }
    if (err instanceof multer.MulterError) {
      const tooLarge = err.code === 'LIMIT_FILE_SIZE';
      res.status(tooLarge ? 413 : 400).json({ error: tooLarge ? `The file is larger than ${MAX_DOCUMENT_MB} MB.` : err.message, code: err.code });
      return;
    }
    res.status((err as { statusCode?: number }).statusCode ?? 400).json({ error: (err as Error).message, code: (err as { code?: string }).code });
  });
}

const ownPrefix = (userId: string) => `private:verification/${userId}/`;

/** Rows leave the API without storage references; viewers use GET /:id/documents. */
function withoutDocumentRefs<T extends Record<string, unknown>>(row: T): Omit<T, 'selfie_url' | 'id_document_url'> & { has_selfie: boolean; has_id_document: boolean } {
  const { selfie_url, id_document_url, ...rest } = row;
  return { ...rest, has_selfie: Boolean(selfie_url), has_id_document: Boolean(id_document_url) };
}

/** POST /api/verification/documents — store one selfie or identity document privately. */
router.post('/documents', requireAuth, acceptDocument, async (req: Request, res: Response) => {
  const file = req.file;
  const kind = (req.body as { kind?: string }).kind;
  if (kind !== 'selfie' && kind !== 'id') { res.status(400).json({ error: 'kind must be "selfie" or "id"' }); return; }
  if (!file) { res.status(400).json({ error: 'No file uploaded. Use multipart/form-data with field name "file".' }); return; }
  try {
    const mismatch = await validateFileBytes(file.buffer, file.mimetype);
    if (mismatch) { res.status(415).json({ error: mismatch, code: 'MAGIC_BYTE_MISMATCH' }); return; }
    const ref = await storePrivateFile(`verification/${req.user!.id}`, file.buffer, file.mimetype);
    res.status(201).json({ ref, kind });
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode ?? 500;
    logger.error({ err: (err as Error).message }, 'verification document upload failed');
    res.status(status).json({ error: status === 503 ? 'Document upload is temporarily unavailable.' : 'Could not store the document' });
  }
});

router.post('/request', requireAuth, async (req: Request, res: Response) => {
  const body = req.body as Record<string, string>;
  const { verification_type = 'personal', supporting_docs, reason } = body;
  const selfieRef = body.selfie_ref ?? body.selfie_url;
  const idRef = body.id_document_ref ?? body.id_document_url;
  const validTypes = ['personal', 'business', 'creator', 'official'];
  if (!validTypes.includes(verification_type)) {
    res.status(400).json({ error: `Invalid verification_type. Must be: ${validTypes.join(', ')}` }); return;
  }
  // Only documents this person uploaded through POST /documents are accepted;
  // public URLs are refused so identity documents never become public again.
  const mine = (ref: unknown): ref is string => isPrivateRef(ref) && ref.startsWith(ownPrefix(req.user!.id));
  if (!mine(selfieRef) || !mine(idRef)) {
    res.status(400).json({ error: 'Upload the selfie and the ID document first (POST /api/verification/documents), then send their references.' }); return;
  }
  try {
    const { rows: existing } = await pool.query(
      'SELECT id,status,selfie_url,id_document_url FROM verification_requests WHERE user_id=$1 ORDER BY created_at DESC',
      [req.user!.id],
    );
    if (existing.some((r) => r.status === 'pending')) { res.status(409).json({ error: 'You already have a pending verification request' }); return; }
    const params = [req.user!.id, verification_type, selfieRef, idRef, supporting_docs ?? null, reason ?? null];
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
    // Documents from the replaced request are no longer needed.
    if (existing.length) {
      const replaced = [existing[0].selfie_url, existing[0].id_document_url].filter((r) => r && r !== selfieRef && r !== idRef);
      if (replaced.length) await deleteStoredFiles(replaced);
    }
    res.status(201).json(withoutDocumentRefs(rows[0]));
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
    res.json(rows[0] ? withoutDocumentRefs(rows[0]) : null);
  } catch { res.status(500).json({ error: 'Failed to fetch verification request' }); }
});

router.get('/', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { status = 'pending', limit = '50', offset = '0' } = req.query as Record<string, string>;
    const { rows } = await pool.query(
      `SELECT vr.*,u.email,up.display_name,up.avatar_url FROM verification_requests vr
       JOIN users u ON u.id=vr.user_id ${personProfileJoin('vr.user_id', 'up')}
       WHERE vr.status=$1 ORDER BY vr.created_at DESC LIMIT $2 OFFSET $3`,
      [status, parseInt(limit), parseInt(offset)],
    );
    res.json(rows.map(withoutDocumentRefs));
  } catch { res.status(500).json({ error: 'Failed to fetch requests' }); }
});

/**
 * GET /api/verification/:id/documents — short-lived links for the request's
 * owner or an admin. Links expire after DEFAULT_LINK_SECONDS.
 */
router.get('/:id/documents', requireAuth, async (req: Request, res: Response) => {
  if (!/^[0-9a-f-]{36}$/i.test(String(req.params.id))) { res.status(404).json({ error: 'Request not found' }); return; }
  try {
    const { rows } = await pool.query(
      'SELECT user_id, selfie_url, id_document_url FROM verification_requests WHERE id=$1',
      [req.params.id],
    );
    const row = rows[0] as { user_id: string; selfie_url: string | null; id_document_url: string | null } | undefined;
    // Same answer for "missing" and "not yours", so request IDs cannot be probed.
    if (!row || (row.user_id !== req.user!.id && req.user!.role !== 'admin')) { res.status(404).json({ error: 'Request not found' }); return; }
    const link = async (ref: string | null) => {
      if (!ref) return null;
      if (isPrivateRef(ref)) return { url: await privateFileLink(ref), expires_in: DEFAULT_LINK_SECONDS };
      return { url: ref, legacy: true }; // public URL from before F-013; moved by the migration script
    };
    res.set('Cache-Control', 'private, no-store');
    res.json({ selfie: await link(row.selfie_url), id_document: await link(row.id_document_url) });
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'verification document link failed');
    res.status((err as { statusCode?: number }).statusCode === 503 ? 503 : 500).json({ error: 'Could not create document links' });
  }
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
