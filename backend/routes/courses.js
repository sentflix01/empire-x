const router = require('express').Router();
const pool = require('../db/pool');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { listRecords, getRecord, createRecord, updateRecord, deleteRecord } = require('../utils/crud');

// List published courses
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { category, sort = '-created_at', limit = 50 } = req.query;
    const filter = { is_published: true };
    if (category) filter.category = category;
    res.json(await listRecords('courses', { filter, sort, limit }));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const course = await getRecord('courses', req.params.id);
    if (!course) return res.status(404).json({ error: 'Course not found' });
    // Get lessons (only free ones for non-enrolled)
    const { rows: lessons } = await pool.query(
      'SELECT * FROM course_lessons WHERE course_id = $1 ORDER BY position ASC',
      [req.params.id]
    );
    res.json({ ...course, lessons });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch course' });
  }
});

// Create course
router.post('/', requireAuth, async (req, res) => {
  try {
    const { title } = req.body;
    if (!title) return res.status(400).json({ error: 'title is required' });
    const course = await createRecord('courses', { ...req.body, creator_id: req.user.id });
    res.status(201).json(course);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create course' });
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const existing = await getRecord('courses', req.params.id);
    if (!existing) return res.status(404).json({ error: 'Course not found' });
    if (existing.creator_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.json(await updateRecord('courses', req.params.id, req.body));
  } catch (err) {
    res.status(500).json({ error: 'Failed to update course' });
  }
});

// Add lesson to course
router.post('/:id/lessons', requireAuth, async (req, res) => {
  try {
    const course = await getRecord('courses', req.params.id);
    if (!course) return res.status(404).json({ error: 'Course not found' });
    if (course.creator_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { title, description, video_url, duration, position, is_free } = req.body;
    if (!title) return res.status(400).json({ error: 'title is required' });
    const { rows } = await pool.query(
      `INSERT INTO course_lessons (course_id, title, description, video_url, duration, position, is_free)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.params.id, title, description || null, video_url || null, duration || null, position || 0, is_free || false]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add lesson' });
  }
});

// Enroll in course
router.post('/:id/enroll', requireAuth, async (req, res) => {
  try {
    const course = await getRecord('courses', req.params.id);
    if (!course) return res.status(404).json({ error: 'Course not found' });
    const { rows } = await pool.query(
      `INSERT INTO course_enrollments (course_id, user_id)
       VALUES ($1, $2) ON CONFLICT (course_id, user_id) DO NOTHING RETURNING *`,
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(409).json({ error: 'Already enrolled' });
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to enroll' });
  }
});

// Check enrollment
router.get('/:id/enrolled', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM course_enrollments WHERE course_id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    res.json({ enrolled: rows.length > 0, enrollment: rows[0] || null });
  } catch (err) {
    res.status(500).json({ error: 'Failed to check enrollment' });
  }
});

// Update progress
router.put('/:id/progress', requireAuth, async (req, res) => {
  const { progress } = req.body;
  try {
    await pool.query(
      'UPDATE course_enrollments SET progress = $1 WHERE course_id = $2 AND user_id = $3',
      [progress, req.params.id, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

module.exports = router;
