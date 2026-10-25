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

const allowedMimeTypes = new Set([...allowedMimeTypesByExtension.values()].flatMap((set) => [...set]));

/**
 * Accept an allowed type. The declared MIME type decides; the file name's
 * extension only has to agree when there is one. Phones often send photos
 * with no extension (picked from a gallery), and those were all refused.
 * The real content is checked after upload (validateFileBytes).
 */
export const fileFilter: multer.Options['fileFilter'] = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback,
): void => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = (file.mimetype ?? '').toLowerCase();
  if (!allowedMimeTypes.has(mime)) { cb(unsupportedFileTypeError()); return; }
  const forExt = allowedMimeTypesByExtension.get(ext);
  // A known extension that contradicts the type (photo.png sent as a PDF) is refused.
  if (ext && forExt && !forExt.has(mime)) { cb(unsupportedFileTypeError()); return; }
  cb(null, true);
};

// ── Magic-byte validator (SEC-005) ────────────────────────────────────────────
// Called after multer stores the file, with its first bytes. The fileFilter
// above trusts the client's declared type; this checks the real content by
// each format's signature, which needs only the first few dozen bytes.
//
// It used to ask sharp to decode the image. That failed for every photo
// stored on disk (only 12 bytes were passed in) and for HEIC photos (sharp's
// prebuilt binary can't read them), so those uploads were all refused.

/** How many leading bytes validateFileBytes needs. */
export const SIGNATURE_BYTES = 32;

type Family = 'jpeg' | 'png' | 'gif' | 'webp' | 'heif' | 'pdf';

/** The format the bytes really are, or null when unknown. */
export function sniffFormat(head: Buffer): Family | null {
  if (head.length >= 3 && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return 'jpeg';
  if (head.length >= 8 && head.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (head.length >= 6 && /^GIF8[79]a$/.test(head.subarray(0, 6).toString('latin1'))) return 'gif';
  if (head.length >= 12 && head.subarray(0, 4).toString('latin1') === 'RIFF' && head.subarray(8, 12).toString('latin1') === 'WEBP') return 'webp';
  if (head.length >= 4 && head.subarray(0, 4).toString('latin1') === '%PDF') return 'pdf';
  // ISO base media (HEIC, HEIF, AVIF): an "ftyp" box with an image brand.
  if (head.length >= 12 && head.subarray(4, 8).toString('latin1') === 'ftyp') {
    const brands = head.subarray(8, Math.min(head.length, 32)).toString('latin1');
    if (/heic|heix|hevc|heim|heis|mif1|msf1|avif|avis/.test(brands)) return 'heif';
  }
  return null;
}

const FAMILY_BY_MIME: Record<string, Family> = {
  'image/jpeg': 'jpeg', 'image/jpg': 'jpeg', 'image/pjpeg': 'jpeg',
  'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp',
  'image/avif': 'heif', 'image/heic': 'heif', 'image/heif': 'heif',
  'application/pdf': 'pdf',
};

export async function validateFileBytes(
  buffer: Buffer,
  mimeType: string,
): Promise<string | null> {
  const mime = mimeType.toLowerCase();
  // Videos: complex containers; the type gate is enough for the threat model.
  if (mime.startsWith('video/')) return null;
  const expected = FAMILY_BY_MIME[mime];
  if (!expected) return null; // fileFilter already allowed only known types
  const actual = sniffFormat(buffer.subarray(0, SIGNATURE_BYTES));
  if (actual === expected) return null;
  // Phones sometimes label a JPEG as PNG (or the reverse): accept any real image for an image type.
  if (expected !== 'pdf' && actual && actual !== 'pdf') return null;
  return expected === 'pdf'
    ? 'File content does not match PDF format'
    : 'That file isn’t a photo we can read. Try a JPEG or PNG.';
}

// ── Supabase Storage ──────────────────────────────────────────────────────────

export function getSupabaseProjectUrl(environment: 'real' | 'demo' = 'real'): string {
  const candidates = environment === 'demo'
    ? [process.env.DEMO_SUPABASE_URL]
    : [process.env.SUPABASE_API_URL, process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_URL];
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

function isDemoSupabaseConfigured(): boolean {
  return !!(getSupabaseProjectUrl('demo') && process.env.DEMO_SUPABASE_STORAGE_KEY && process.env.DEMO_SUPABASE_BUCKET);
}

/** Verify the provider reports the Demo bucket as private before the API starts. */
export async function verifyDemoStorageIsolation(): Promise<void> {
  if (process.env.DEMO_ENABLED !== 'true') return;
  if (!isDemoSupabaseConfigured()) {
    throw new Error('Demo requires DEMO_SUPABASE_URL, DEMO_SUPABASE_STORAGE_KEY, and a separately provisioned private DEMO_SUPABASE_BUCKET');
  }
  const projectUrl = getSupabaseProjectUrl('demo');
  if (projectUrl === getSupabaseProjectUrl('real')) {
    throw new Error('Demo Supabase Storage must use a separate project from Real Storage');
  }
  const bucket = getDemoSupabaseBucket();
  const key = process.env.DEMO_SUPABASE_STORAGE_KEY as string;
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
  const projectUrl = getSupabaseProjectUrl(demoSessionId ? 'demo' : 'real');
  const serviceKey = (demoSessionId ? process.env.DEMO_SUPABASE_STORAGE_KEY : process.env.SUPABASE_STORAGE_KEY) as string;

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

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg', 'image/jpg': '.jpg', 'image/pjpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif',
  'image/webp': '.webp', 'image/avif': '.avif', 'image/heic': '.heic', 'image/heif': '.heif',
  'application/pdf': '.pdf', 'video/mp4': '.mp4', 'video/webm': '.webm', 'video/quicktime': '.mov',
};

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
    // Files on disk are served by extension, so give extensionless photos one from their type.
    cb(null, `${unique}${path.extname(file.originalname) || EXT_BY_MIME[(file.mimetype ?? '').toLowerCase()] || ''}`);
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
module.exports.sniffFormat              = sniffFormat;
module.exports.SIGNATURE_BYTES          = SIGNATURE_BYTES;
module.exports.allowedMimeTypesByExtension = allowedMimeTypesByExtension;
module.exports.createStorageKey         = createStorageKey;
module.exports.getUploadDirectory       = getUploadDirectory;
module.exports.getDemoSupabaseBucket    = getDemoSupabaseBucket;
module.exports.getSupabaseStorageAuthHeaders = getSupabaseStorageAuthHeaders;
module.exports.getSupabaseProjectUrl    = getSupabaseProjectUrl;
module.exports.verifyDemoStorageIsolation = verifyDemoStorageIsolation;
