import { Router } from 'express';
import type { Request, Response } from 'express';
import logger from '../lib/logger';
import { requireAuth } from '../middleware/auth';
import upload, { uploadFile, isCloudStorageConfigured } from '../middleware/upload';

const router = Router();

router.post('/', requireAuth, upload.single('file'), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) { res.status(400).json({ error: 'No file uploaded. Use multipart/form-data with field name "file".' }); return; }

    let url: string;
    if (isCloudStorageConfigured() && file.buffer) {
      url = await uploadFile(file.buffer, file.originalname, file.mimetype);
    } else if (file.path) {
      // Local disk fallback
      const filename = require('path').basename(file.path) as string;
      url = `${process.env.API_URL ?? 'http://localhost:3001'}/uploads/${filename}`;
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
