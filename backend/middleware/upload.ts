/**
 * middleware/upload.ts — File upload middleware
 *
 * Storage providers (priority order):
 *   1. Supabase Storage — SUPABASE_URL, SUPABASE_STORAGE_KEY, SUPABASE_BUCKET
 *   2. Cloudflare R2    — R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL
 *   3. Local disk       — dev fallback, lost on redeploy
 *
 * Uses @aws-sdk/client-s3 for both Supabase and R2.
 *
 * SEC-005: Magic-byte validation via sharp for images and header check for PDF.
 * Both the declared MIME/extension and the actual file bytes must agree before
 * the file is accepted. This prevents content-type spoofing (e.g. a ZIP with a
 * .jpg extension and image/jpeg MIME type).
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
  ['.pdf',  new Set(['application/pdf'])],
  ['.mp4',  new Set(['video/mp4'])],
  ['.webm', new Set(['video/webm'])],
  ['.mov',  new Set(['video/quicktime'])],
]);

function unsupportedFileTypeError(): Error & { code: string; statusCode: number } {
  const error = Object.assign(
    new Error('File type not allowed. Accepted: JPEG, PNG, GIF, WebP, AVIF, HEIC, PDF, MP4, WebM, MOV'),
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

// ── Magic-byte validator (SEC-005) ────────────────────────────────────────────
// Called AFTER multer writes the buffer (memoryStorage) or disk file so the
// actual file bytes are available. The fileFilter above only checks the
// client-declared MIME type + extension; this function checks the real content.
//
// Strategy per format:
//   Images (JPEG/PNG/GIF/WebP/AVIF/HEIC) — attempt a sharp metadata decode.
//     sharp is already a dependency and reads just enough bytes to identify
//     the format without decoding the full image.
//   PDF — check the 4-byte magic header (%PDF).
//   Videos (MP4/WebM/MOV) — skip content check; video containers are complex
//     and sharp cannot read them. The MIME/extension gate is sufficient for
//     the current threat model.
//
// Returns null on success, or an error message string on failure.

export async function validateFileBytes(
  buffer: Buffer,
  mimeType: string,
): Promise<string | null> {
  const mime = mimeType.toLowerCase();

  // PDF: must start with %PDF
  if (mime === 'application/pdf') {
    if (buffer.length < 4 || buffer.slice(0, 4).toString('ascii') !== '%PDF') {
      return 'File content does not match PDF format';
    }
    return null;
  }

  // Videos: skip magic-byte check — complex container formats
  if (mime.startsWith('video/')) return null;

  // Images: use sharp to attempt metadata extraction
  if (mime.startsWith('image/')) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sharpLib = require('sharp') as any;
      // sharp's default export is the callable constructor
      const sharpFn = typeof sharpLib === 'function' ? sharpLib : sharpLib.default;
      await sharpFn(buffer).metadata();
      return null; // sharp decoded it successfully — it's a real image
    } catch {
      return 'File content does not match the declared image format';
    }
  }

  // Unknown category — pass through (fileFilter already whitelisted the type)
  return null;
}

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

/** Build Storage API credentials for both current `sb_secret_` and legacy JWT keys. */
export function getSupabaseStorageAuthHeaders(key = process.env.SUPABASE_STORAGE_KEY): Record<string, string> {
  if (!key) throw new Error('SUPABASE_STORAGE_KEY is required for Supabase Storage');
  // New API keys are opaque, not JWTs. Supabase requires them on `apikey` only;
  // sending one as a Bearer token can fail JWT validation.
  if (key.startsWith('sb_secret_')) return { apikey: key };
  // Keep the legacy service_role JWT working during a staged key migration.
  return { Authorization: `Bearer ${key}`, apikey: key };
}

export function getDemoSupabaseBucket(): string {
  const demoBucket = process.env.DEMO_SUPABASE_BUCKET?.trim();
  if (!demoBucket || !/^[a-z0-9][a-z0-9_-]{1,62}$/i.test(demoBucket)) {
    throw Object.assign(new Error('Demo uploads require a separately provisioned private DEMO_SUPABASE_BUCKET'), { statusCode: 503 });
  }
  if (demoBucket.toLowerCase() === process.env.SUPABASE_BUCKET?.trim().toLowerCase()) {
    throw Object.assign(new Error('DEMO_SUPABASE_BUCKET must be different from the public Real bucket'), { statusCode: 503 });
  }
  return demoBucket;
}

/** Verify the provider reports the Demo bucket as private before the API starts. */
export async function verifyDemoStorageIsolation(): Promise<void> {
  if (process.env.DEMO_ENABLED !== 'true') return;
  if (!isSupabaseConfigured()) {
    throw new Error('Demo requires Supabase Storage with a separately provisioned private bucket; public R2/local Demo uploads are not enabled');
  }
  const bucket = getDemoSupabaseBucket();
  const projectUrl = getSupabaseProjectUrl();
  const key = process.env.SUPABASE_STORAGE_KEY as string;
  const response = await fetch(`${projectUrl}/storage/v1/bucket/${encodeURIComponent(bucket)}`, {
    headers: getSupabaseStorageAuthHeaders(key),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new Error(`Demo private Storage bucket "${bucket}" could not be verified (HTTP ${response.status}); create it as private before enabling Demo`);
  }
  const details = await response.json() as { id?: string; name?: string; public?: boolean };
  if ((details.id && details.id !== bucket) || details.public !== false) {
    throw new Error(`Demo Storage bucket "${bucket}" must exist and have public=false before enabling Demo`);
  }
}

function assertValidDemoSessionId(sessionId: string): void {
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(sessionId)) {
    throw new Error('Invalid demo session ID for upload storage');
  }
}

export function createStorageKey(originalName: string, demoSessionId?: string, unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`): string {
  const ext = path.extname(originalName).toLowerCase();
  if (demoSessionId) {
    assertValidDemoSessionId(demoSessionId);
    return `demo/${demoSessionId}/uploads/${unique}${ext}`;
  }
  return `uploads/${unique}${ext}`;
}

export function getUploadDirectory(baseDirectory: string, demoSessionId?: string): string {
  if (!demoSessionId) return baseDirectory;
  assertValidDemoSessionId(demoSessionId);
  return path.join(baseDirectory, 'demo', demoSessionId, 'uploads');
}

export async function uploadToSupabase(
  buffer: Buffer,
  originalName: string,
  mimeType: string,
  demoSessionId?: string,
): Promise<string> {
  const key = createStorageKey(originalName, demoSessionId);
  const bucket = demoSessionId ? getDemoSupabaseBucket() : process.env.SUPABASE_BUCKET as string;
  const projectUrl = getSupabaseProjectUrl();
  const serviceKey = process.env.SUPABASE_STORAGE_KEY as string;

  if (!projectUrl.startsWith('https://')) {
    throw new Error(`Invalid SUPABASE_URL: "${projectUrl}". Must be https://xxx.supabase.co`);
  }

  const response = await fetch(`${projectUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${key.split('/').map(encodeURIComponent).join('/')}`, {
    method: 'POST',
    headers: {
      ...getSupabaseStorageAuthHeaders(serviceKey),
      'Content-Type': mimeType,
      'Cache-Control': demoSessionId ? 'private, no-store' : 'public, max-age=31536000',
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
  if (demoSessionId) {
    const signedResponse = await fetch(`${projectUrl}/storage/v1/object/sign/${encodeURIComponent(bucket)}/${key.split('/').map(encodeURIComponent).join('/')}`, {
      method: 'POST',
      headers: { ...getSupabaseStorageAuthHeaders(serviceKey), 'Content-Type': 'application/json' },
      body: JSON.stringify({ expiresIn: 7 * 24 * 60 * 60 }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!signedResponse.ok) {
      throw new Error(`Could not create a temporary private Demo asset URL [${signedResponse.status}]: ${await signedResponse.text()}`);
    }
    const signed = await signedResponse.json() as { signedURL?: string; signedUrl?: string };
    const signedUrl = signed.signedURL ?? signed.signedUrl;
    if (!signedUrl) throw new Error('Storage provider returned no signed Demo asset URL');
    if (/^https:\/\//i.test(signedUrl)) return signedUrl;
    return `${projectUrl}/storage/v1${signedUrl.startsWith('/') ? signedUrl : `/${signedUrl}`}`;
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
  demoSessionId?: string,
): Promise<string> {
  if (demoSessionId) {
    throw Object.assign(new Error('Demo uploads currently require the verified private Supabase Storage bucket'), { statusCode: 503 });
  }
  const { PutObjectCommand } = require('@aws-sdk/client-s3') as typeof import('@aws-sdk/client-s3');
  const key = createStorageKey(originalName, demoSessionId);

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
  demoSessionId?: string,
): Promise<string> {
  if (isSupabaseConfigured()) return uploadToSupabase(buffer, originalName, mimeType, demoSessionId);
  if (isR2Configured())       return uploadToR2(buffer, originalName, mimeType, demoSessionId);
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

// Use process.cwd() so the uploads folder is always at /app/uploads
// regardless of where the compiled file lives (avoids /app/dist/uploads issue)
const uploadDir = path.join(process.cwd(), process.env.UPLOAD_DIR ?? 'uploads');
if (!fs.existsSync(uploadDir)) {
  try { fs.mkdirSync(uploadDir, { recursive: true }); } catch { /* already exists or Supabase/R2 in use */ }
}

const diskStorage = multer.diskStorage({
  destination: (req: Request, _file: Express.Multer.File, cb: (err: Error | null, dest: string) => void) => {
    try {
      const destination = getUploadDirectory(uploadDir, req.demoSession?.id);
      fs.mkdir(destination, { recursive: true }, (err) => cb(err, destination));
    } catch (error) {
      cb(error as Error, '');
    }
  },
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
module.exports.validateFileBytes        = validateFileBytes;
module.exports.allowedMimeTypesByExtension = allowedMimeTypesByExtension;
module.exports.createStorageKey         = createStorageKey;
module.exports.getUploadDirectory       = getUploadDirectory;
module.exports.getDemoSupabaseBucket    = getDemoSupabaseBucket;
module.exports.getSupabaseStorageAuthHeaders = getSupabaseStorageAuthHeaders;
module.exports.verifyDemoStorageIsolation = verifyDemoStorageIsolation;
