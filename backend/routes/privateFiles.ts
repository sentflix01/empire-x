/**
 * GET /api/private-files/<key>?expires=…&signature=… — local development only.
 *
 * Serves a privately stored file (lib/privateFiles.ts) when the link's HMAC
 * signature is valid and unexpired. With a private Supabase bucket configured
 * (staging, production) links point at Supabase instead and this route answers 404.
 */
import { Router } from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import { resolveLocalPrivateLink } from '../lib/privateFiles';

const router = Router();

const CONTENT_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp',
  '.heic': 'image/heic', '.heif': 'image/heif', '.pdf': 'application/pdf',
};

router.get('/*key', (req: Request, res: Response) => {
  const raw = (req.params as { key?: string | string[] }).key;
  const key = Array.isArray(raw) ? raw.join('/') : String(raw ?? '');
  const { expires, signature } = req.query as Record<string, string | undefined>;
  const file = resolveLocalPrivateLink(key, expires, signature);
  if (!file) { res.status(404).json({ error: 'Not found' }); return; }
  res.set({
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
    'Content-Disposition': 'inline',
    'Content-Type': CONTENT_TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream',
  });
  res.sendFile(file);
});

module.exports = router;
