/**
 * upload.js — File upload middleware
 *
 * Storage providers (in priority order):
 *   1. Supabase Storage (free, no card) — set SUPABASE_URL, SUPABASE_STORAGE_KEY, SUPABASE_BUCKET
 *   2. Cloudflare R2 — set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL
 *   3. Local disk (default / dev fallback)
 *
 * @aws-sdk/client-s3 is already installed and used for both Supabase and R2.
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');

const configuredMaxSizeMB = Number.parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10);
const maxSizeMB = Number.isFinite(configuredMaxSizeMB) && configuredMaxSizeMB > 0
  ? configuredMaxSizeMB
  : 10;

// Keep the extension and declared MIME type in agreement.  Checking only the
// filename allowed a text or executable payload renamed to `photo.jpg` through
// the upload endpoint, which then produced broken image previews (and was not a
// meaningful server-side allowlist).
const allowedMimeTypesByExtension = new Map([
  ['.jpg',  new Set(['image/jpeg', 'image/jpg', 'image/pjpeg'])],
  ['.jpeg', new Set(['image/jpeg', 'image/jpg', 'image/pjpeg'])],
  ['.jfif', new Set(['image/jpeg', 'image/jpg', 'image/pjpeg'])],
  ['.png',  new Set(['image/png'])],
  ['.gif',  new Set(['image/gif'])],
  ['.webp', new Set(['image/webp'])],
  ['.avif', new Set(['image/avif'])],
  ['.heic', new Set(['image/heic', 'image/heif'])],
  ['.heif', new Set(['image/heif', 'image/heic'])],
  ['.svg',  new Set(['image/svg+xml'])],
  ['.pdf',  new Set(['application/pdf'])],
  // Stories already accepts these formats in its picker and renders them in a
  // <video> element.  Accepting them here keeps the common upload endpoint in
  // sync with that UI and the API documentation.
  ['.mp4',  new Set(['video/mp4'])],
  ['.webm', new Set(['video/webm'])],
  ['.mov',  new Set(['video/quicktime'])],
]);

function unsupportedFileTypeError() {
  const error = new Error(
    'File type not allowed. Accepted: JPEG, PNG, GIF, WebP, AVIF, HEIC, SVG, PDF, MP4, WebM, MOV'
  );
  error.code = 'UNSUPPORTED_FILE_TYPE';
  error.statusCode = 415;
  return error;
}

// Allowed file types
const fileFilter = (_req, file, cb) => {
  const extension = path.extname(file.originalname).toLowerCase();
  const mimeType = (file.mimetype || '').toLowerCase();
  const allowedMimeTypes = allowedMimeTypesByExtension.get(extension);

  if (!allowedMimeTypes || !allowedMimeTypes.has(mimeType)) {
    return cb(unsupportedFileTypeError());
  }

  cb(null, true);
};

// ── Supabase Storage (free tier) ─────────────────────────────────────────────
// Uses Supabase Storage REST API directly — no S3 compat layer needed.
// Docs: https://supabase.com/docs/guides/storage/uploads/standard-uploads
function isSupabaseConfigured() {
  return !!(
    process.env.SUPABASE_URL &&
    process.env.SUPABASE_STORAGE_KEY &&
    process.env.SUPABASE_BUCKET
  );
}

async function uploadToSupabase(buffer, originalName, mimeType) {
  const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const ext = path.extname(originalName).toLowerCase();
  const key = `uploads/${unique}${ext}`;
  const bucket = process.env.SUPABASE_BUCKET;
  const projectUrl = process.env.SUPABASE_URL.replace(/\/$/, '');
  const serviceKey = process.env.SUPABASE_STORAGE_KEY;

  const uploadUrl = `${projectUrl}/storage/v1/object/${bucket}/${key}`;

  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': mimeType,
      'Cache-Control': 'public, max-age=31536000',
      'x-upsert': 'true',
    },
    body: buffer,
    duplex: 'half',         // required in Node ≥ 18 when body is a Buffer
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Supabase upload failed [${response.status}]: ${errText}`);
  }

  // Public URL: <project>/storage/v1/object/public/<bucket>/<key>
  return `${projectUrl}/storage/v1/object/public/${bucket}/${key}`;
}

// ── Cloudflare R2 ─────────────────────────────────────────────────────────
function isR2Configured() {
  return !!(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME &&
    process.env.R2_PUBLIC_URL
  );
}

let r2Client = null;
function getR2Client() {
  if (r2Client) return r2Client;
  const { S3Client } = require('@aws-sdk/client-s3');
  r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
  return r2Client;
}

async function uploadToR2(buffer, originalName, mimeType) {
  const { PutObjectCommand } = require('@aws-sdk/client-s3');
  const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const ext = path.extname(originalName).toLowerCase();
  const key = `uploads/${unique}${ext}`;

  await getR2Client().send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
    CacheControl: 'public, max-age=31536000',
  }));

  const publicUrl = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');
  if (!publicUrl) throw new Error('R2_PUBLIC_URL is required when using Cloudflare R2');
  return `${publicUrl}/${key}`;
}

// ── Unified upload helper ─────────────────────────────────────────────────
// Used by routes/upload.js — picks the active provider automatically.
async function uploadFile(buffer, originalName, mimeType) {
  if (isSupabaseConfigured()) return uploadToSupabase(buffer, originalName, mimeType);
  if (isR2Configured())       return uploadToR2(buffer, originalName, mimeType);
  throw new Error('No cloud storage configured — set SUPABASE_URL/SUPABASE_STORAGE_KEY/SUPABASE_BUCKET or R2 vars');
}

function isCloudStorageConfigured() {
  return isSupabaseConfigured() || isR2Configured();
}

function activeStorageProvider() {
  if (isSupabaseConfigured()) return 'supabase';
  if (isR2Configured())       return 'r2';
  return 'local';
}

// ── Local disk storage (dev fallback) ─────────────────────────────────────
const uploadDir = path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const diskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

// ── Multer instance ───────────────────────────────────────────────────────
// Use memory storage for cloud providers (buffer needed), disk for local.
const upload = multer({
  storage: isCloudStorageConfigured() ? multer.memoryStorage() : diskStorage,
  fileFilter,
  limits: { fileSize: maxSizeMB * 1024 * 1024 },
});

module.exports = upload;
module.exports.uploadFile           = uploadFile;
module.exports.uploadToR2           = uploadToR2;         // kept for back-compat
module.exports.uploadToSupabase     = uploadToSupabase;
module.exports.isR2Configured       = isR2Configured;
module.exports.isSupabaseConfigured = isSupabaseConfigured;
module.exports.isCloudStorageConfigured = isCloudStorageConfigured;
module.exports.activeStorageProvider    = activeStorageProvider;
module.exports.fileFilter               = fileFilter;
module.exports.allowedMimeTypesByExtension = allowedMimeTypesByExtension;
