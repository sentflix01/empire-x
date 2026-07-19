/**
 * upload.js — File upload middleware
 *
 * Development (default): saves files to local /uploads directory.
 * Production: set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
 *             R2_BUCKET_NAME, and R2_PUBLIC_URL in .env to use Cloudflare R2.
 *
 * @aws-sdk/client-s3 is already installed — no extra packages needed.
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

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

// ── R2 storage ────────────────────────────────────────────────────────────
function isR2Configured() {
  return !!(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME
  );
}

let s3Client = null;
function getS3Client() {
  if (s3Client) return s3Client;
  const { S3Client } = require('@aws-sdk/client-s3');
  s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
  return s3Client;
}

/**
 * Upload a buffer to Cloudflare R2.
 * Returns the public URL of the uploaded file.
 */
async function uploadToR2(buffer, originalName, mimeType) {
  const { PutObjectCommand } = require('@aws-sdk/client-s3');
  const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const ext = path.extname(originalName).toLowerCase();
  const key = `uploads/${unique}${ext}`;

  await getS3Client().send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
    CacheControl: 'public, max-age=31536000',
  }));

  const publicUrlRaw = process.env.R2_PUBLIC_URL;
  if (!publicUrlRaw) {
    throw new Error('R2_PUBLIC_URL is required when using Cloudflare R2');
  }
  const publicUrl = publicUrlRaw.replace(/\/$/, '');
  return `${publicUrl}/${key}`;
}

// ── Local disk storage (development) ────────────────────────────────────
const uploadDir = path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const diskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

// ── Multer instance ───────────────────────────────────────────────────────
// Always use memory storage when R2 is configured so we can pass the buffer directly.
// Use disk storage otherwise.
const upload = multer({
  storage: isR2Configured() ? multer.memoryStorage() : diskStorage,
  fileFilter,
  limits: { fileSize: maxSizeMB * 1024 * 1024 },
});

module.exports = upload;
module.exports.uploadToR2 = uploadToR2;
module.exports.isR2Configured = isR2Configured;
