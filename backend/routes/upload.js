const router = require('express').Router();
const path = require('path');
const { requireAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Upload a single file, returns a public URL
router.post('/', requireAuth, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const host = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3001}`;
  const fileUrl = `${host}/uploads/${req.file.filename}`;
  res.json({ url: fileUrl, filename: req.file.filename });
});

// Upload multiple files (max 10)
router.post('/multiple', requireAuth, upload.array('files', 10), (req, res) => {
  if (!req.files || !req.files.length) {
    return res.status(400).json({ error: 'No files uploaded' });
  }
  const host = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3001}`;
  const urls = req.files.map(f => ({
    url: `${host}/uploads/${f.filename}`,
    filename: f.filename,
  }));
  res.json({ files: urls });
});

module.exports = router;
