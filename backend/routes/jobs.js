const router = require('express').Router();
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { listRecords, getRecord, createRecord, updateRecord, deleteRecord } = require('../utils/crud');
const pool = require('../db/pool');

// List jobs
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { status = 'open', job_type, category, sort = '-created_at', limit = 50 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (job_type) filter.job_type = job_type;
    if (category) filter.category = category;
    res.json(await listRecords('jobs', { filter, sort, limit }));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const job = await getRecord('jobs', req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json(job);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch job' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const { title } = req.body;
    if (!title) return res.status(400).json({ error: 'title is required' });
    const job = await createRecord('jobs', { ...req.body, poster_id: req.user.id });
    res.status(201).json(job);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create job' });
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const existing = await getRecord('jobs', req.params.id);
    if (!existing) return res.status(404).json({ error: 'Job not found' });
    if (existing.poster_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.json(await updateRecord('jobs', req.params.id, req.body));
  } catch (err) {
    res.status(500).json({ error: 'Failed to update job' });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const existing = await getRecord('jobs', req.params.id);
    if (!existing) return res.status(404).json({ error: 'Job not found' });
    if (existing.poster_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await deleteRecord('jobs', req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete job' });
  }
});

// Apply for a job
router.post('/:id/apply', requireAuth, async (req, res) => {
  try {
    const job = await getRecord('jobs', req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (job.poster_id === req.user.id) {
      return res.status(400).json({ error: 'Cannot apply to your own job posting' });
    }
    const { cover_letter, resume_url } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO job_applications (job_id, applicant_id, cover_letter, resume_url)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (job_id, applicant_id) DO NOTHING RETURNING *`,
      [req.params.id, req.user.id, cover_letter || null, resume_url || null]
    );
    if (!rows.length) return res.status(409).json({ error: 'Already applied' });
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to apply' });
  }
});

// Get applications for a job (poster only)
router.get('/:id/applications', requireAuth, async (req, res) => {
  try {
    const job = await getRecord('jobs', req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (job.poster_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { rows } = await pool.query(
      `SELECT ja.*, up.display_name, up.avatar_url, up.headline
       FROM job_applications ja
       LEFT JOIN user_profiles up ON up.user_id = ja.applicant_id
       WHERE ja.job_id = $1
       ORDER BY ja.created_at DESC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// Update application status
router.put('/applications/:id', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE job_applications SET status = $1
       WHERE id = $2 RETURNING *`,
      [req.body.status, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Application not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update application' });
  }
});

module.exports = router;
