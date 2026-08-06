const router = require('express').Router();
const path = require('path');
const { requireAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { uploadFile, isCloudStorageConfigured, activeStorageProvider } = require('../middleware/upload');

/**
 * Get a public URL for a locally stored file.
 */
function localUrl(req, filename) {
  // Return the public origin used by this request. Defaulting to localhost
  // caused production uploads to be saved with URLs that no browser could load.
  const forwardedProto = req.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const forwardedHost = req.get('x-forwarded-host')?.split(',')[0]?.trim();
  const protocol = forwardedProto || req.protocol || 'http';
  const host = forwardedHost || req.get('host');
  const origin = host
    ? `${protocol}://${host}`
    : (process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3001}`);
  return `${origin.replace(/\/$/, '')}/uploads/${encodeURIComponent(filename)}`;
}

/**
 * After multer runs, route the file to cloud storage or return the local URL.
 * Returns { url, filename }
 */
async function resolveUpload(req, file) {
  if (isCloudStorageConfigured()) {
    // file.buffer is available when multer uses memoryStorage
    const url = await uploadFile(file.buffer, file.originalname, file.mimetype);
    return { url, filename: path.basename(url) };
  }
  // Local disk — file.filename and file.path are set by diskStorage
  return { url: localUrl(req, file.filename), filename: file.filename };
}

// POST /api/upload — single file
router.post('/', requireAuth, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  try {
    // Falls back to local disk when no cloud provider is configured
    // (same behavior as /api/upload/multiple).
    const result = await resolveUpload(req, req.file);
    res.json(result);
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Upload failed: ' + err.message });
  }
});

// POST /api/upload/multiple — up to 10 files
router.post('/multiple', requireAuth, upload.array('files', 10), async (req, res) => {
  if (!req.files?.length) return res.status(400).json({ error: 'No files uploaded' });
  try {
    const files = await Promise.all(req.files.map(file => resolveUpload(req, file)));
    res.json({ files });
  } catch (err) {
    console.error('Multi-upload error:', err);
    res.status(500).json({ error: 'Upload failed: ' + err.message });
  }
});

module.exports = router;
