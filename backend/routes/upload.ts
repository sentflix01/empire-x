import { Router } from 'express';
import type { Request, Response } from 'express';
import logger from '../lib/logger';
import { requireAuth } from '../middleware/auth';
import upload, { uploadFile, isCloudStorageConfigured, validateFileBytes } from '../middleware/upload';
import { signDemoAssetToken } from '../middleware/demoEnvironment';

const router = Router();

router.post('/', requireAuth, upload.single('file'), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) { res.status(400).json({ error: 'No file uploaded. Use multipart/form-data with field name "file".' }); return; }

    // ── Magic-byte validation (SEC-005) ───────────────────────────────────────
    // For cloud storage (memoryStorage) the buffer is always available.
    // For local disk storage, read the first 12 bytes for the check.
    let bufferForCheck: Buffer | null = null;
    if (file.buffer) {
      bufferForCheck = file.buffer;
    } else if (file.path) {
      try {
        const fs = require('fs') as typeof import('fs');
        const fd = fs.openSync(file.path, 'r');
        const head = Buffer.alloc(12);
        fs.readSync(fd, head, 0, 12, 0);
        fs.closeSync(fd);
        bufferForCheck = head;
      } catch { /* non-fatal — skip magic-byte check for disk files */ }
    }

    if (bufferForCheck) {
      const magicError = await validateFileBytes(bufferForCheck, file.mimetype);
      if (magicError) {
        if (file.path) {
          const fs = require('fs/promises') as typeof import('fs/promises');
          await fs.rm(file.path, { force: true }).catch(() => undefined);
        }
        res.status(415).json({ error: magicError, code: 'MAGIC_BYTE_MISMATCH' });
        return;
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    let url: string;
    if (isCloudStorageConfigured() && file.buffer) {
      url = await uploadFile(file.buffer, file.originalname, file.mimetype, req.demoSession?.id);
    } else if (file.path) {
      // Local disk fallback
      const path = require('path') as typeof import('path');
      const relativePath = path.relative(path.join(process.cwd(), process.env.UPLOAD_DIR ?? 'uploads'), file.path)
        .split(path.sep)
        .map(encodeURIComponent)
        .join('/');
      const apiBase = (process.env.API_URL ?? 'http://localhost:3001').replace(/\/$/, '');
      const assetToken = req.demoSession
        ? `?demo_asset=${encodeURIComponent(signDemoAssetToken(req.demoSession.id, decodeURIComponent(relativePath)))}`
        : '';
      url = `${apiBase}/uploads/${relativePath}${assetToken}`;
    } else {
      res.status(500).json({ error: 'Upload failed — no storage configured' }); return;
    }

    res.json({
      url,
      filename: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    });
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'Upload error');
    const status = (err as { statusCode?: number }).statusCode ?? 500;
    res.status(status).json({ error: (err as Error).message ?? 'Upload failed' });
  }
});

module.exports = router;
