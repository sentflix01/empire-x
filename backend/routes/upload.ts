import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import logger from '../lib/logger';
import { requireAuth } from '../middleware/auth';
import upload, { uploadFile, isCloudStorageConfigured, validateFileBytes, SIGNATURE_BYTES } from '../middleware/upload';
import { signDemoAssetToken } from '../middleware/demoEnvironment';

const router = Router();

/** Most files one multi-upload request may carry (product galleries use up to 6). */
export const MAX_FILES_PER_REQUEST = 10;

interface StoredFile { url: string; filename: string; mimetype: string; size: number }

/** First bytes of the upload, for the content-signature check (SEC-005). */
function readHead(file: Express.Multer.File): Buffer | null {
  // Cloud storage keeps the file in memory; local disk storage needs a read.
  if (file.buffer) return file.buffer;
  if (!file.path) return null;
  try {
    const fs = require('fs') as typeof import('fs');
    const fd = fs.openSync(file.path, 'r');
    const head = Buffer.alloc(SIGNATURE_BYTES);
    fs.readSync(fd, head, 0, SIGNATURE_BYTES, 0);
    fs.closeSync(fd);
    return head;
  } catch {
    return null; // non-fatal — skip the check when the disk file cannot be read
  }
}

async function removeLocalCopy(file: Express.Multer.File): Promise<void> {
  if (!file.path) return;
  const fs = require('fs/promises') as typeof import('fs/promises');
  await fs.rm(file.path, { force: true }).catch(() => undefined);
}

/** Returns an error message when the file's real content does not match its declared type. */
async function contentError(file: Express.Multer.File): Promise<string | null> {
  const head = readHead(file);
  return head ? validateFileBytes(head, file.mimetype) : null;
}

/** Stores a checked file and returns its public URL. Throws when no storage is configured. */
async function storeFile(req: Request, file: Express.Multer.File): Promise<StoredFile> {
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
    throw Object.assign(new Error('Upload failed — no storage configured'), { statusCode: 500 });
  }
  return { url, filename: file.originalname, mimetype: file.mimetype, size: file.size };
}

function sendUploadError(res: Response, err: unknown): void {
  logger.error({ err: (err as Error).message }, 'Upload error');
  const status = (err as { statusCode?: number }).statusCode ?? 500;
  res.status(status).json({ error: (err as Error).message ?? 'Upload failed' });
}

router.post('/', requireAuth, upload.single('file'), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) { res.status(400).json({ error: 'No file uploaded. Use multipart/form-data with field name "file".' }); return; }

    const magicError = await contentError(file);
    if (magicError) {
      await removeLocalCopy(file);
      res.status(415).json({ error: magicError, code: 'MAGIC_BYTE_MISMATCH' });
      return;
    }

    res.json(await storeFile(req, file));
  } catch (err) {
    sendUploadError(res, err);
  }
});

/**
 * Accepts up to MAX_FILES_PER_REQUEST files in the `files` field and turns
 * multer's limit errors into clear 4xx answers instead of a generic failure.
 */
function acceptFiles(req: Request, res: Response, next: NextFunction): void {
  upload.array('files', MAX_FILES_PER_REQUEST)(req, res, (err?: unknown) => {
    if (!err) { next(); return; }
    if (err instanceof multer.MulterError) {
      const tooLarge = err.code === 'LIMIT_FILE_SIZE';
      const tooMany = err.code === 'LIMIT_UNEXPECTED_FILE' || err.code === 'LIMIT_FILE_COUNT';
      res.status(tooLarge ? 413 : 400).json({
        error: tooLarge ? 'One of the files is too large.'
          : tooMany ? `Send at most ${MAX_FILES_PER_REQUEST} files, in the field "files".`
          : err.message,
        code: err.code,
      });
      return;
    }
    const status = (err as { statusCode?: number }).statusCode ?? 400;
    res.status(status).json({ error: (err as Error).message, code: (err as { code?: string }).code });
  });
}

/**
 * POST /api/upload/multiple — several photos in one request (product galleries).
 * Every file passes the same content check as a single upload; if any fails,
 * nothing is stored. Answers { files: [{ url, filename, mimetype, size }] } in
 * the order the files were sent.
 */
router.post('/multiple', requireAuth, acceptFiles, async (req: Request, res: Response) => {
  const files = (Array.isArray(req.files) ? req.files : []) as Express.Multer.File[];
  try {
    if (!files.length) { res.status(400).json({ error: 'No files uploaded. Use multipart/form-data with field name "files".' }); return; }

    for (const [index, file] of files.entries()) {
      const magicError = await contentError(file);
      if (magicError) {
        await Promise.all(files.map(removeLocalCopy));
        res.status(415).json({ error: `${file.originalname}: ${magicError}`, code: 'MAGIC_BYTE_MISMATCH', index });
        return;
      }
    }

    const stored: StoredFile[] = [];
    for (const file of files) stored.push(await storeFile(req, file));
    res.json({ files: stored });
  } catch (err) {
    sendUploadError(res, err);
  }
});

module.exports = router;
module.exports.MAX_FILES_PER_REQUEST = MAX_FILES_PER_REQUEST;
