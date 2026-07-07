const router = require('express').Router();
const path = require('path');
const { requireAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { uploadToR2, isR2Configured } = require('../middleware/upload');

/**
 * Get a public URL for a locally stored file.
 */
function localUrl(filename) {
  const host = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3001}`;
  return `${host}/uploads/${filename}`;
}

/**
 * After multer runs, route the file to R2 or return the local URL.
 * Returns { url, filename }
 */
async function resolveUpload(file) {
  if (isR2Configured()) {
    // file.buffer is available when multer uses memoryStorage
    const url = await uploadToR2(file.buffer, file.originalname, file.mimetype);
    return { url, filename: path.basename(url) };
  }
  // Local disk — file.filename and file.path are set by diskStorage
  return { url: localUrl(file.filename), filename: file.filename };
}

// POST /api/upload — single file
router.post('/', requireAuth, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  try {
    const result = await resolveUpload(req.file);
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
    const files = await Promise.all(req.files.map(resolveUpload));
    res.json({ files });
  } catch (err) {
    console.error('Multi-upload error:', err);
    res.status(500).json({ error: 'Upload failed: ' + err.message });
  }
});

module.exports = router;
