const router = require('express').Router();
const pool = require('../db/pool');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { listRecords, getRecord, createRecord, updateRecord, deleteRecord } = require('../utils/crud');

// List events
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { status = 'published', sort = '-start_at', limit = 50 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    const events = await listRecords('events', { filter, sort, limit });
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Get single event
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const event = await getRecord('events', req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    res.json(event);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

// Create event
router.post('/', requireAuth, async (req, res) => {
  try {
    const { title, start_at } = req.body;
    if (!title || !start_at) {
      return res.status(400).json({ error: 'title and start_at are required' });
    }
    const event = await createRecord('events', { ...req.body, organizer_id: req.user.id });
    res.status(201).json(event);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// Update event
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const existing = await getRecord('events', req.params.id);
    if (!existing) return res.status(404).json({ error: 'Event not found' });
    if (existing.organizer_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.json(await updateRecord('events', req.params.id, req.body));
  } catch (err) {
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// Delete event
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const existing = await getRecord('events', req.params.id);
    if (!existing) return res.status(404).json({ error: 'Event not found' });
    if (existing.organizer_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await deleteRecord('events', req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

// Book a ticket
router.post('/:id/book', requireAuth, async (req, res) => {
  try {
    const event = await getRecord('events', req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (event.status !== 'published') {
      return res.status(400).json({ error: 'Event is not available for booking' });
    }
    // Check capacity
    if (event.capacity) {
      const { rows } = await pool.query(
        'SELECT COUNT(*) FROM event_tickets WHERE event_id = $1 AND status = $2',
        [event.id, 'active']
      );
      if (parseInt(rows[0].count) >= event.capacity) {
        return res.status(400).json({ error: 'Event is fully booked' });
      }
    }
    const { rows } = await pool.query(
      `INSERT INTO event_tickets (event_id, user_id) VALUES ($1, $2)
       ON CONFLICT (event_id, user_id) DO NOTHING RETURNING *`,
      [event.id, req.user.id]
    );
    if (!rows.length) {
      return res.status(409).json({ error: 'Already booked' });
    }
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to book ticket' });
  }
});

// Get attendees for an event
router.get('/:id/attendees', optionalAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT et.*, up.display_name, up.avatar_url
       FROM event_tickets et
       LEFT JOIN user_profiles up ON up.user_id = et.user_id
       WHERE et.event_id = $1 AND et.status = 'active'
       ORDER BY et.created_at DESC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch attendees' });
  }
});

module.exports = router;
