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

const maxSizeMB = parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10);

// Allowed file types
const fileFilter = (_req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp|svg|pdf/;
  const ext = path.extname(file.originalname).toLowerCase().slice(1);
  if (allowed.test(ext)) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed. Accepted: jpeg, jpg, png, gif, webp, svg, pdf'));
  }
};

// ── Supabase Storage (free tier, S3-compatible) ───────────────────────────
// Setup: supabase.com → new project → Storage → create public bucket
// Keys: Project Settings → API → service_role key (for SUPABASE_STORAGE_KEY)
//       and Project URL (for SUPABASE_URL)
function isSupabaseConfigured() {
  return !!(
    process.env.SUPABASE_URL &&
    process.env.SUPABASE_STORAGE_KEY &&
    process.env.SUPABASE_BUCKET
  );
}

let supabaseS3Client = null;
function getSupabaseS3Client() {
  if (supabaseS3Client) return supabaseS3Client;
  const { S3Client } = require('@aws-sdk/client-s3');
  // Supabase exposes an S3-compatible endpoint at /storage/v1/s3
  const projectUrl = process.env.SUPABASE_URL.replace(/\/$/, '');
  supabaseS3Client = new S3Client({
    region: 'auto',
    endpoint: `${projectUrl}/storage/v1/s3`,
    credentials: {
      accessKeyId: process.env.SUPABASE_STORAGE_KEY,
      secretAccessKey: process.env.SUPABASE_STORAGE_KEY,
    },
    forcePathStyle: true,
  });
  return supabaseS3Client;
}

async function uploadToSupabase(buffer, originalName, mimeType) {
  const { PutObjectCommand } = require('@aws-sdk/client-s3');
  const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const ext = path.extname(originalName).toLowerCase();
  const key = `uploads/${unique}${ext}`;
  const bucket = process.env.SUPABASE_BUCKET;

  await getSupabaseS3Client().send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
    CacheControl: 'public, max-age=31536000',
  }));

  // Public URL format: <project-url>/storage/v1/object/public/<bucket>/<key>
  const projectUrl = process.env.SUPABASE_URL.replace(/\/$/, '');
  return `${projectUrl}/storage/v1/object/public/${bucket}/${key}`;
}

// ── Cloudflare R2 ─────────────────────────────────────────────────────────
function isR2Configured() {
  return !!(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME
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
