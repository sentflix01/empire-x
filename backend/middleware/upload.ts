/**
 * middleware/upload.ts — File upload middleware
 *
 * Storage providers (priority order):
 *   1. Supabase Storage — SUPABASE_URL, SUPABASE_STORAGE_KEY, SUPABASE_BUCKET
 *   2. Cloudflare R2    — R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL
 *   3. Local disk       — dev fallback, lost on redeploy
 *
 * Uses @aws-sdk/client-s3 for both Supabase and R2.
 */
import multer from 'multer';
import type { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';
import type { Request } from 'express';

// ── File size ─────────────────────────────────────────────────────────────────

const configuredMaxSizeMB = parseInt(process.env.MAX_FILE_SIZE_MB ?? '10', 10);
const maxSizeMB = Number.isFinite(configuredMaxSizeMB) && configuredMaxSizeMB > 0
  ? configuredMaxSizeMB
  : 10;

// ── MIME allowlist ────────────────────────────────────────────────────────────

const allowedMimeTypesByExtension = new Map<string, Set<string>>([
  ['.jpg',  new Set(['image/jpeg', 'image/jpg', 'image/pjpeg'])],
  ['.jpeg', new Set(['image/jpeg', 'image/jpg', 'image/pjpeg'])],
  ['.jfif', new Set(['image/jpeg', 'image/jpg', 'image/pjpeg'])],
  ['.png',  new Set(['image/png'])],
  ['.gif',  new Set(['image/gif'])],
  ['.webp', new Set(['image/webp'])],
  ['.avif', new Set(['image/avif'])],
  ['.heic', new Set(['image/heic', 'image/heif'])],
  ['.heif', new Set(['image/heif', 'image/heic'])],
  ['.',  new Set(['image/svg+xml'])],
  ['.pdf',  new Set(['application/pdf'])],
  ['.mp4',  new Set(['video/mp4'])],
  ['.webm', new Set(['video/webm'])],
  ['.mov',  new Set(['video/quicktime'])],
]);

function unsupportedFileTypeError(): Error & { code: string; statusCode: number } {
  const error = Object.assign(
    new Error('File type not allowed. Accepted: JPEG, PNG, GIF, WebP, AVIF, HEIC, SVG, PDF, MP4, WebM, MOV'),
    { code: 'UNSUPPORTED_FILE_TYPE', statusCode: 415 },
  );
  return error;
}

export const fileFilter: multer.Options['fileFilter'] = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback,
): void => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = (file.mimetype ?? '').toLowerCase();
  const allowed = allowedMimeTypesByExtension.get(ext);
  if (!allowed?.has(mime)) {
    cb(unsupportedFileTypeError());
    return;
  }
  cb(null, true);
};

// ── Supabase Storage ──────────────────────────────────────────────────────────

function getSupabaseProjectUrl(): string {
  const candidates = [
    process.env.SUPABASE_API_URL,
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_URL,
  ];
  for (const raw of candidates) {
    if (!raw) continue;
    const match = raw.match(/https:\/\/[a-z0-9]+\.supabase\.co/);
    if (match) return match[0];
  }
  return '';
}

export function isSupabaseConfigured(): boolean {
  return !!(getSupabaseProjectUrl() && process.env.SUPABASE_STORAGE_KEY && process.env.SUPABASE_BUCKET);
}

export async function uploadToSupabase(
  buffer: Buffer,
  originalName: string,
  mimeType: string,
): Promise<string> {
  const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const ext = path.extname(originalName).toLowerCase();
  const key = `uploads/${unique}${ext}`;
  const bucket = process.env.SUPABASE_BUCKET as string;
  const projectUrl = getSupabaseProjectUrl();
  const serviceKey = process.env.SUPABASE_STORAGE_KEY as string;

  if (!projectUrl.startsWith('https://')) {
    throw new Error(`Invalid SUPABASE_URL: "${projectUrl}". Must be https://xxx.supabase.co`);
  }

  const response = await fetch(`${projectUrl}/storage/v1/object/${bucket}/${key}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': mimeType,
      'Cache-Control': 'public, max-age=31536000',
      'x-upsert': 'true',
    },
    body: buffer,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    duplex: 'half' as any,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Supabase upload failed [${response.status}]: ${errText}`);
  }
  return `${projectUrl}/storage/v1/object/public/${bucket}/${key}`;
}

// ── Cloudflare R2 ─────────────────────────────────────────────────────────────

export function isR2Configured(): boolean {
  return !!(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME &&
    process.env.R2_PUBLIC_URL
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let r2Client: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getR2Client(): any {
  if (r2Client) return r2Client;
  const { S3Client } = require('@aws-sdk/client-s3') as typeof import('@aws-sdk/client-s3');
  r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID as string,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY as string,
    },
  });
  return r2Client;
}

export async function uploadToR2(
  buffer: Buffer,
  originalName: string,
  mimeType: string,
): Promise<string> {
  const { PutObjectCommand } = require('@aws-sdk/client-s3') as typeof import('@aws-sdk/client-s3');
  const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const ext = path.extname(originalName).toLowerCase();
  const key = `uploads/${unique}${ext}`;

  await getR2Client().send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME as string,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
    CacheControl: 'public, max-age=31536000',
  }));

  const publicUrl = (process.env.R2_PUBLIC_URL ?? '').replace(/\/$/, '');
  if (!publicUrl) throw new Error('R2_PUBLIC_URL is required when using Cloudflare R2');
  return `${publicUrl}/${key}`;
}

// ── Unified upload helper ─────────────────────────────────────────────────────

export async function uploadFile(
  buffer: Buffer,
  originalName: string,
  mimeType: string,
): Promise<string> {
  if (isSupabaseConfigured()) return uploadToSupabase(buffer, originalName, mimeType);
  if (isR2Configured())       return uploadToR2(buffer, originalName, mimeType);
  throw new Error('No cloud storage configured — set Supabase or R2 env vars');
}

export function isCloudStorageConfigured(): boolean {
  return isSupabaseConfigured() || isR2Configured();
}

export function activeStorageProvider(): 'supabase' | 'r2' | 'local' {
  if (isSupabaseConfigured()) return 'supabase';
  if (isR2Configured())       return 'r2';
  return 'local';
}

// ── Local disk (dev fallback) ─────────────────────────────────────────────────

const uploadDir = path.join(__dirname, '..', process.env.UPLOAD_DIR ?? 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const diskStorage = multer.diskStorage({
  destination: (_req: Request, _file: Express.Multer.File, cb: (err: Error | null, dest: string) => void) => cb(null, uploadDir),
  filename: (_req: Request, file: Express.Multer.File, cb: (err: Error | null, name: string) => void) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

// ── Multer instance ───────────────────────────────────────────────────────────

const upload = multer({
  storage: isCloudStorageConfigured() ? multer.memoryStorage() : diskStorage,
  fileFilter,
  limits: { fileSize: maxSizeMB * 1024 * 1024 },
});

export default upload;

module.exports = upload;
module.exports.uploadFile               = uploadFile;
module.exports.uploadToR2               = uploadToR2;
module.exports.uploadToSupabase         = uploadToSupabase;
module.exports.isR2Configured           = isR2Configured;
module.exports.isSupabaseConfigured     = isSupabaseConfigured;
module.exports.isCloudStorageConfigured = isCloudStorageConfigured;
module.exports.activeStorageProvider    = activeStorageProvider;
module.exports.fileFilter               = fileFilter;
module.exports.allowedMimeTypesByExtension = allowedMimeTypesByExtension;
