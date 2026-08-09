const router = require('express').Router();
const logger = require('../lib/logger');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { listRecords, getRecord, createRecord, updateRecord, deleteRecord } = require('../utils/crud');
const pool = require('../db/pool');

// Tasks
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { requester_id, agent_id, status, sort = '-created_at', limit = 50 } = req.query;
    const filter = {};
    if (requester_id) filter.requester_id = requester_id;
    if (agent_id) filter.agent_id = agent_id;
    if (status) filter.status = status;
    res.json(await listRecords('tasks', { filter, sort, limit }));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const task = await getRecord('tasks', req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const { title, task_type, offered_payment } = req.body;
    if (!title || !task_type || offered_payment == null) {
      return res.status(400).json({ error: 'title, task_type, and offered_payment are required' });
    }
    const task = await createRecord('tasks', { ...req.body, requester_id: req.user.id });
    res.status(201).json(task);
  } catch (err) {
    logger.error({ err: err?.message || err }, 'Error');
    res.status(500).json({ error: 'Failed to create task' });
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const existing = await getRecord('tasks', req.params.id);
    if (!existing) return res.status(404).json({ error: 'Task not found' });
    if (existing.requester_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.json(await updateRecord('tasks', req.params.id, req.body));
  } catch (err) {
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Bid update — must be before /:id routes to avoid Express matching 'bids' as a task id
router.put('/bids/:bidId', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM task_bids WHERE id = $1', [req.params.bidId]);
    if (!rows.length) return res.status(404).json({ error: 'Bid not found' });
    const bid = rows[0];
    const task = await getRecord('tasks', bid.task_id);
    if (bid.bidder_id !== req.user.id && task.requester_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const updated = await updateRecord('task_bids', req.params.bidId, req.body);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update bid' });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const existing = await getRecord('tasks', req.params.id);
    if (!existing) return res.status(404).json({ error: 'Task not found' });
    if (existing.requester_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await deleteRecord('tasks', req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// Task Bids
router.get('/:taskId/bids', optionalAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM task_bids WHERE task_id = $1 ORDER BY created_at DESC',
      [req.params.taskId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch bids' });
  }
});

router.post('/:taskId/bids', requireAuth, async (req, res) => {
  try {
    const { bid_amount, message } = req.body;
    if (bid_amount == null) return res.status(400).json({ error: 'bid_amount is required' });
    const task = await getRecord('tasks', req.params.taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (task.requester_id === req.user.id) {
      return res.status(400).json({ error: 'Cannot bid on your own task' });
    }

    // Fetch bidder name
    const { rows: profiles } = await pool.query(
      'SELECT display_name FROM user_profiles WHERE user_id = $1',
      [req.user.id]
    );
    const bidder_name = profiles[0]?.display_name || null;

    const { rows } = await pool.query(
      `INSERT INTO task_bids (task_id, bidder_id, bidder_name, bid_amount, message)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.params.taskId, req.user.id, bidder_name, bid_amount, message || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    logger.error({ err: err?.message || err }, 'Error');
    res.status(500).json({ error: 'Failed to create bid' });
  }
});

module.exports = router;
